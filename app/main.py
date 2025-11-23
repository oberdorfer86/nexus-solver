# Bloco 1: Imports e Configuração FastAPI
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn
import re
import numpy as np
from typing import Optional, Dict, Union, List, Any
from pydantic import BaseModel
from sympy import sympify, solve, Eq, latex, integrate, diff, Symbol, lambdify, simplify 
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application

app = FastAPI(title="NEXUS Solver v1.0")

app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

class CalculationRequest(BaseModel):
    expression: str
    variables: Optional[Dict[str, Union[str, float, int]]] = None

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# Bloco 2: Pré-processamento e Limpeza de Expressão
def preprocess_expression(expr_str):
    if not expr_str: return ""
    expr_str = str(expr_str).strip()
    expr_str = expr_str.replace('"', '').replace("'", "")
    # Remove caracteres de espaço invisíveis e normaliza espaços
    expr_str = expr_str.replace('\u200b', '').replace('\xa0', ' ')
    # AQUI: Remove múltiplos espaços para evitar erros, mas mantém um único espaço
    expr_str = re.sub(r'\s+', ' ', expr_str) 
    expr_str = expr_str.replace(',', '.')
    expr_str = re.sub(r'd\s+([a-zA-Z])', r'd\1', expr_str)
    
    replacements = {
        '⋅': '*', '×': '*', '∗': '*', '−': '-', 
        ':': '/', '÷': '/', '\\pi': 'pi', 
        '\\left': '', '\\right': ''
    }
    for old, new in replacements.items():
        expr_str = expr_str.replace(old, new)
        
    # Remove espaços entre números e parênteses que a SymPy não entende bem (ex: 2 (x+1) -> 2*(x+1))
    expr_str = re.sub(r'(\d)\s*\(', r'\1*(', expr_str) 
    # Remove espaços em volta de operadores para limpeza final antes da SymPy
    expr_str = re.sub(r'\s*([+\-*/^=])\s*', r'\1', expr_str)
    
    return expr_str

def smart_sympify(expr_str, local_dict=None):
    # A SymPy espera ** para potência
    expr_str = expr_str.replace('^', '**')
    # Usar transformações ajuda a interpretar a sintaxe científica/matemática.
    transformations = (standard_transformations + (implicit_multiplication_application,))
    try:
        return parse_expr(expr_str, transformations=transformations, local_dict=local_dict)
    except Exception:
        # Tenta a sympify padrão como fallback
        return sympify(expr_str, locals=local_dict)

# Bloco 3: Geração de Dados para Plotly
def generate_plot_data(result_expr):
    """
    Gera pontos X e Y para o frontend renderizar com Plotly.
    Retorna um dicionário com listas.
    """
    try:
        x = Symbol('x')
        # Verifica se depende de x
        if not hasattr(result_expr, 'free_symbols') or x not in result_expr.free_symbols:
            return None
            
        f_lambda = lambdify(x, result_expr, modules=['numpy'])
        
        # Gera 500 pontos para uma curva suave
        x_vals = np.linspace(-10, 10, 500)
        
        try:
            y_vals = f_lambda(x_vals)
            # Se o resultado for constante (array de 1 elemento), expande
            if np.isscalar(y_vals) or y_vals.ndim == 0:
                 y_vals = np.full_like(x_vals, y_vals)
                 
            if np.iscomplexobj(y_vals): return None 
        except:
            return None 

        # Filtra valores infinitos/NaN para não quebrar o JSON
        mask = np.isfinite(y_vals)
        x_clean = x_vals[mask]
        y_clean = y_vals[mask]

        if len(x_clean) < 2: return None

        # Converte para lista Python padrão para serialização JSON
        return {
            "x": x_clean.tolist(),
            "y": y_clean.tolist(),
            "type": "scatter"
        }

    except Exception as e:
        print(f"Erro Data Plot: {e}")
        return None

# Bloco 4: Handler para Comandos de Cálculo (Integral/Derivada)
def handle_calculus_commands(expr_str, local_dict=None):
    x = Symbol('x')
    lower_limit = None
    upper_limit = None
    is_definite = False
    
    # Adiciona suporte a integrais definidas com sintaxe 'int_a^b'
    # Expressões com {} ou sem
    match_complex = re.search(r'int\s*_\s*\{([^\}]+)\}\s*(?:\^|\*\*)\s*\{([^\}]+)\}', expr_str)
    match_simple = re.search(r'int\s*_\s*([0-9a-zA-Z\.\-]+)\s*(?:\^|\*\*)\s*([0-9a-zA-Z\.\-]+)', expr_str)
    limit_match = match_complex or match_simple
    
    if limit_match:
        try:
            lower_str = limit_match.group(1).replace('**', '^')
            upper_str = limit_match.group(2).replace('**', '^')
            lower_limit = smart_sympify(lower_str, local_dict)
            upper_limit = smart_sympify(upper_str, local_dict)
            is_definite = True
            # Substitui a parte da integral por 'int ' para processamento posterior
            expr_str = expr_str.replace(limit_match.group(0), 'int ') 
        except Exception: pass

    if 'int' in expr_str or '∫' in expr_str:
        clean = re.sub(r'int|∫', '', expr_str).strip()
        # Procura a variável de integração, ex: 'dx' no final
        match_var = re.search(r'd([a-zA-Z])\s*$', clean)
        integration_var = x
        if match_var:
            integration_var = Symbol(match_var.group(1))
            clean = clean[:match_var.start()]
        
        inner_func = smart_sympify(clean, local_dict)
        if is_definite:
            # Integrais definidas
            return integrate(inner_func, (integration_var, lower_limit, upper_limit))
        else:
            # Integrais indefinidas
            result = integrate(inner_func, integration_var)
            return result

    # Suporte a d/dx
    if '∂' in expr_str or 'd/dx' in expr_str:
        # Simplifica a sintaxe de derivada para extrair apenas a função
        clean = re.sub(r'\\frac\{\s*∂\s*\}\{\s*∂\s*[a-zA-Z]\s*\}|d/d[a-zA-Z]', '', expr_str)
        return diff(smart_sympify(clean, local_dict), x)
    return None

# Bloco 5: API Endpoint para Cálculo (Lógica Principal)
@app.post("/api/calculate")
async def handle_calculate(request: CalculationRequest):
    # LOG CRÍTICO 1: Exibir dados brutos da requisição
    print(f"--- Cálculo Recebido ---")
    print(f"Expressão Bruta: {request.expression}")
    print(f"Variáveis Recebidas: {request.variables}")
    
    try:
        raw_expr = request.expression
        raw_vars = request.variables or {}
        subs_dict = {}
        
        # Prepara o dicionário de substituição
        for k, v in raw_vars.items():
            if v:
                var_key = k.replace(' ', '_')
                clean_val = str(v).replace(',', '.')
                
                try:
                    # Tenta converter para float
                    subs_dict[Symbol(var_key)] = float(clean_val)
                except ValueError:
                    # Se não for um número, tenta interpretar como expressão SymPy (e.g., 'x**2' ou 'r')
                    try:
                        # CRÍTICO: Use smart_sympify aqui para garantir que "x**2" se torne um objeto Expression.
                        subs_dict[Symbol(var_key)] = smart_sympify(clean_val)
                    except Exception:
                        # Fallback: Se não for um número e nem uma expressão SymPy válida, define como Símbolo Literal
                        subs_dict[Symbol(var_key)] = Symbol(clean_val) 
        
        expr_str = preprocess_expression(raw_expr)
        if not expr_str: raise ValueError("Expressão vazia.")

        # LOG CRÍTICO 2: Exibir dados processados antes da SymPy
        print(f"Expressão Processada (SymPy): {expr_str}")
        print(f"Dicionário de Substituição (SymPy): {subs_dict}")

        result = handle_calculus_commands(expr_str, local_dict=subs_dict)
        
        if result is None:
            # Lógica de Equações (=)
            if "=" in expr_str:
                # ... (Bloco de solução de equação existente)
                parts = expr_str.split('=', 1)
                lhs_str = parts[0].strip()
                rhs_str = parts[1].strip()
                
                lhs = smart_sympify(lhs_str, subs_dict)
                rhs = smart_sympify(rhs_str, subs_dict)
                eq = Eq(lhs, rhs)
                
                free_syms = list(eq.free_symbols)
                
                # CORREÇÃO CRÍTICA DO ERRO 'float' object has no attribute 'is_symbol':
                # Filtramos apenas os símbolos que não têm valor definido no dicionário de substituição.
                syms_to_solve = [s for s in free_syms if s not in subs_dict]
                
                if syms_to_solve:
                    res = solve(eq, syms_to_solve[0])
                    sol_list = []
                    for s in res:
                        simplified_s = simplify(s)
                        if hasattr(simplified_s, 'is_number') and simplified_s.is_number and not simplified_s.is_integer:
                            # CORREÇÃO: Usar .evalf() apenas se houver símbolos SymPy no valor (para garantir que a substituição de variáveis numéricas seja feita)
                            try:
                                value_to_latex = simplified_s.subs(subs_dict).evalf(6)
                            except:
                                value_to_latex = simplified_s.evalf(6)
                            
                            sol_list.append(latex(value_to_latex).replace('.', ',')) 
                        else:
                            # Tenta substituir antes de formatar em LaTeX
                            try:
                                simplified_s = simplified_s.subs(subs_dict)
                            except:
                                pass
                            sol_list.append(latex(simplified_s))
                            
                    # Tenta formatar a solução final com as substituições
                    result_latex = f"{latex(syms_to_solve[0])} = {', '.join(sol_list)}"
                    
                    return {"result_latex": result_latex, "plot_data": None}
                else:
                    # Se não houver variáveis para resolver, avalia a expressão
                    evaluated_eq = eq.evalf(6, subs=subs_dict)
                    if evaluated_eq.is_Relational: # É uma relação (ex: 1 = 1)
                        is_true = evaluated_eq.args[0] == evaluated_eq.args[1]
                        return {"result_latex": "\\text{Verdadeiro}" if is_true else "\\text{Falso}", "plot_data": None}
                    else:
                        # Se for uma equação sem variáveis (ex: 2+3 = 5)
                        return {"result_latex": "\\text{Verdadeiro}" if evaluated_eq == True else "\\text{Falso}", "plot_data": None}
            else:
                # É apenas uma expressão simples
                result = smart_sympify(expr_str, local_dict=subs_dict)
        
        # Substituição final para aplicar variáveis (CRÍTICO)
        if subs_dict and hasattr(result, 'subs'):
            result = result.subs(subs_dict)
            
        # CORREÇÃO CRÍTICA: Força a simplificação para que x^2 + x^2 vire 2*x^2
        if hasattr(result, 'simplify'):
            result = simplify(result)

        is_integral_cmd = ('int' in raw_expr or '∫' in raw_expr)
        is_result_numeric = hasattr(result, 'is_number') and result.is_number
        
        # Formata o resultado
        if is_result_numeric and not result.is_integer:
            result_latex = latex(result.evalf(6)).replace('.', ',')
        else:
            result_latex = latex(result).replace('.', ',')

        if is_integral_cmd and not is_result_numeric and "+ C" not in result_latex and result_latex != "0":
            result_latex += " + C"

        # LOG CRÍTICO 3: Exibir resultado final antes de enviar
        print(f"Resultado Final (SymPy): {result}")
        print(f"Resultado Final (LaTeX): {result_latex}")
        
        plot_data = generate_plot_data(result)
        
        return { "result_latex": result_latex, "plot_data": plot_data }

    except Exception as e:
        # LOG CRÍTICO 4: Captura qualquer erro de processamento
        print(f"ERRO CRÍTICO NO HANDLER: {str(e)}")
        # Retorna um erro amigável em formato LaTeX
        user_msg = r"\color{#ef4444}{\text{Erro: Verifique a sintaxe da expressão e as variáveis.}}"
        return JSONResponse(status_code=400, content={"error": user_msg})

# Bloco 6: Execução do Uvicorn
if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)