### app/main.py (VERSÃO INTERATIVA v7.3 - PLOTLY)
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn
import re
import numpy as np
from typing import Optional, Dict, Union, List, Any
from pydantic import BaseModel
from sympy import sympify, solve, Eq, latex, integrate, diff, Symbol, lambdify
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

# --- 1. FUNÇÃO DE LIMPEZA E TRADUÇÃO ---
def preprocess_expression(expr_str):
    if not expr_str: return ""
    expr_str = str(expr_str).strip()
    expr_str = expr_str.replace('"', '').replace("'", "")
    expr_str = expr_str.replace('\u200b', '').replace('\xa0', ' ')
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
    return expr_str

def smart_sympify(expr_str, local_dict=None):
    expr_str = expr_str.replace('^', '**')
    transformations = (standard_transformations + (implicit_multiplication_application,))
    try:
        return parse_expr(expr_str, transformations=transformations, local_dict=local_dict)
    except Exception:
        return sympify(expr_str, locals=local_dict)

# --- 2. GERADOR DE DADOS PARA PLOTLY (NOVO) ---
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

# --- 3. LÓGICA DE CÁLCULO ---
def handle_calculus_commands(expr_str, local_dict=None):
    x = Symbol('x')
    lower_limit = None
    upper_limit = None
    is_definite = False
    
    match_complex = re.search(r'int\s*_\s*\{([^\}]+)\}\s*(?:\^|\*\*)\s*\{([^\}]+)\}', expr_str)
    match_simple = re.search(r'int\s*_\s*([0-9a-zA-Z\.\-]+)\s*(?:\^|\*\*)\s*([0-9a-zA-Z\.\-]+)', expr_str)
    limit_match = match_complex or match_simple
    
    if limit_match:
        try:
            lower_str = limit_match.group(1)
            upper_str = limit_match.group(2)
            lower_limit = smart_sympify(lower_str, local_dict)
            upper_limit = smart_sympify(upper_str, local_dict)
            is_definite = True
            expr_str = expr_str.replace(limit_match.group(0), 'int ')
        except Exception: pass

    if 'int' in expr_str or '∫' in expr_str:
        clean = re.sub(r'int|∫', '', expr_str)
        match_var = re.search(r'd([a-zA-Z])\s*$', clean)
        integration_var = x
        if match_var:
            integration_var = Symbol(match_var.group(1))
            clean = clean[:match_var.start()]
        inner_func = smart_sympify(clean, local_dict)
        if is_definite:
            return integrate(inner_func, (integration_var, lower_limit, upper_limit))
        else:
            return integrate(inner_func, integration_var)

    if '∂' in expr_str or 'd/dx' in expr_str:
        clean = re.sub(r'\\frac\{\s*∂\s*\}\{\s*∂\s*[a-zA-Z]\s*\}|d/d[a-zA-Z]', '', expr_str)
        return diff(smart_sympify(clean, local_dict), x)
    return None

@app.post("/api/calculate")
async def handle_calculate(request: CalculationRequest):
    try:
        raw_expr = request.expression
        raw_vars = request.variables or {}
        subs_dict = {}
        for k, v in raw_vars.items():
            if v:
                try:
                    clean_val = str(v).replace(',', '.')
                    subs_dict[Symbol(k)] = float(clean_val)
                except: pass

        expr_str = preprocess_expression(raw_expr)
        if not expr_str: raise ValueError("Expressão vazia.")

        result = handle_calculus_commands(expr_str, local_dict=subs_dict)
        
        if result is None:
            # Lógica de Equações (=)
            if "=" in expr_str:
                parts = expr_str.split('=', 1)
                lhs_str = parts[0].strip()
                rhs_str = parts[1].strip()
                lhs_subs = subs_dict.copy()
                # Remove a própria variável se estiver sendo definida
                if re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', lhs_str):
                     keys_to_remove = [k for k in lhs_subs.keys() if str(k) == lhs_str]
                     for k in keys_to_remove: del lhs_subs[k]

                lhs = smart_sympify(lhs_str, lhs_subs)
                rhs = smart_sympify(rhs_str, subs_dict)
                eq = Eq(lhs, rhs)
                syms = list(eq.free_symbols)
                
                if syms:
                    res = solve(eq, syms[0])
                    sol_list = []
                    for s in res:
                        if hasattr(s, 'is_number') and s.is_number and not s.is_integer:
                            sol_list.append(latex(s.evalf(6)).replace('.', ','))
                        else:
                            sol_list.append(latex(s))
                    return {"result_latex": f"{latex(syms[0])} = {', '.join(sol_list)}", "plot_data": None}
                else:
                    return {"result_latex": "\\text{Verdadeiro}" if eq else "\\text{Falso}", "plot_data": None}
            else:
                result = smart_sympify(expr_str, local_dict=subs_dict)

        if subs_dict and hasattr(result, 'subs'):
            result = result.subs(subs_dict)

        is_integral_cmd = ('int' in raw_expr or '∫' in raw_expr)
        is_result_numeric = hasattr(result, 'is_number') and result.is_number
        
        if is_result_numeric and not result.is_integer:
            result_latex = latex(result.evalf(6)).replace('.', ',')
        else:
            result_latex = latex(result).replace('.', ',')

        if is_integral_cmd and not is_result_numeric and "+ C" not in result_latex and result_latex != "0":
            result_latex += " + C"

        # GERA DADOS INTERATIVOS (não mais imagem base64)
        plot_data = generate_plot_data(result)
        
        return { "result_latex": result_latex, "plot_data": plot_data }

    except Exception as e:
        print(f"Erro Interno: {str(e)}")
        user_msg = r"\color{#ef4444}{\text{Erro: Verifique a sintaxe da expressão.}}"
        return JSONResponse(status_code=400, content={"error": user_msg})

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)