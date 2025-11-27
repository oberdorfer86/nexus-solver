# Bloco 1: Importações e Modelos de Dados
# -----
from pathlib import Path
from typing import Optional, Dict, Union
import re

import numpy as np
from fastapi import APIRouter, Request, FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from sympy import (
    Eq,
    Symbol,
    diff,
    integrate,
    lambdify,
    latex,
    simplify,
    solve,
    sympify,
)
from sympy.parsing.sympy_parser import (
    implicit_multiplication_application,
    parse_expr,
    standard_transformations,
)

router = APIRouter(tags=["Solver"])


class CalculationRequest(BaseModel):
    expression: str
    variables: Optional[Dict[str, Union[str, float, int]]] = None
# -----





# Bloco 2: Configuração de Diretórios e Templates
# -----
BASE_DIR = Path(__file__).resolve().parent
TEMPLATE_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"
APPS_DIR = BASE_DIR.parent.parent
CORE_TEMPLATES_DIR = APPS_DIR / "nexus-core" / "templates"

templates = Jinja2Templates(
    directory=[
        str(TEMPLATE_DIR),
        str(CORE_TEMPLATES_DIR),
    ]
)
# -----




# Bloco 3: Função de Registro de Arquivos Estáticos
# -----
def register_static(app: FastAPI) -> None:
    """Expose solver static assets inside the core container."""
    if STATIC_DIR.is_dir():
        app.mount(
            "/solver/static",
            StaticFiles(directory=str(STATIC_DIR)),
            name="solver_static",
        )
# -----




# Bloco 4: Funções de Pré-processamento e SymPy
# -----
def preprocess_expression(expr_str):
    # CÓDIGO INALTERADO (já robusto)
    if not expr_str:
        return ""
    expr_str = str(expr_str).strip()
    expr_str = expr_str.replace('"', "").replace("'", "")
    expr_str = expr_str.replace("\u200b", "").replace("\xa0", " ")
    expr_str = re.sub(r"\s+", " ", expr_str)
    expr_str = expr_str.replace(",", ".")
    expr_str = re.sub(r"d\s+([a-zA-Z])", r"d\1", expr_str)

    replacements = {
        "⋅": "*",
        "×": "*",
        "∗": "*",
        "−": "-",
        ":": "/",
        "÷": "/",
        "\\pi": "pi",
        "\\left": "",
        "\\right": "",
        "pi": "pi", 
    }
    for old, new in replacements.items():
        expr_str = expr_str.replace(old, new)
        
    functions_to_protect = [
        "sin", "cos", "tan", "cot", "sec", "csc", "asin", "acos", "atan",
        "log", "ln", "exp", "sqrt"
    ]
    for func in functions_to_protect:
        if func == "ln":
            expr_str = re.sub(r"\b" + func + r"\b", "log", expr_str, flags=re.IGNORECASE)
        elif func == "sqrt":
            expr_str = re.sub(r"\b" + func + r"\b", "sqrt", expr_str, flags=re.IGNORECASE)
        else:
            expr_str = re.sub(r"\b" + func + r"\b", func, expr_str, flags=re.IGNORECASE)


    expr_str = re.sub(r"(\d)\s*\(", r"\1*(", expr_str)
    expr_str = re.sub(r"\s*([+\-*/^=])\s*", r"\1", expr_str)

    return expr_str


def smart_sympify(expr_str, local_dict=None):
    expr_str = expr_str.replace("^", "**")
    transformations = standard_transformations + (implicit_multiplication_application,)
    
    # OTIMIZAÇÃO CRÍTICA: Importa Símbolos e Funções para garantir parsing correto.
    from sympy import sin, cos, tan, log, exp, sqrt, pi, E, I 
    sympify_globals = {
        'sin': sin, 'cos': cos, 'tan': tan, 'log': log, 'exp': exp, 'sqrt': sqrt, 
        'pi': pi, 'E': E, 'I': I
    }
    
    if local_dict:
        sympify_globals.update(local_dict)

    try:
        # Usa o dicionário global robusto para parsing
        return parse_expr(expr_str, transformations=transformations, local_dict=sympify_globals) 
    except Exception:
        # Fallback (menos robusto)
        return sympify(expr_str, locals=local_dict)


def generate_plot_data(result_expr):
    # CÓDIGO INALTERADO
    try:
        x = Symbol("x")
        if not hasattr(result_expr, "free_symbols") or x not in result_expr.free_symbols:
            return None

        f_lambda = lambdify(x, result_expr, modules=["numpy"])

        x_vals = np.linspace(-10, 10, 500)

        try:
            y_vals = f_lambda(x_vals)
            if np.isscalar(y_vals) or getattr(y_vals, "ndim", 0) == 0:
                y_vals = np.full_like(x_vals, y_vals)

            if np.iscomplexobj(y_vals):
                return None
        except Exception:
            return None

        mask = np.isfinite(y_vals)
        x_clean = x_vals[mask]
        y_clean = y_vals[mask]

        if len(x_clean) < 2:
            return None

        return {
            "x": x_clean.tolist(),
            "y": y_clean.tolist(),
            "type": "scatter",
        }

    except Exception as exc:  # pragma: no cover - diagnostic aid
        print(f"Erro Data Plot: {exc}")
        return None


def handle_calculus_commands(expr_str, local_dict=None):
    # CÓDIGO INALTERADO (Apenas o import de limit é necessário para a função limit,
    # que já estava sendo feita corretamente no Bloco 4.)
    x = Symbol("x")
    lower_limit = None
    upper_limit = None
    is_definite = False

    match_complex = re.search(r"int\s*_\s*\{([^\}]+)\}\s*(?:\^|\*\*)\s*\{([^\}]+)\}", expr_str)
    match_simple = re.search(r"int\s*_\s*([0-9a-zA-Z\.\-]+)\s*(?:\^|\*\*)\s*([0-9a-zA-Z\.\-]+)", expr_str)
    limit_match = match_complex or match_simple

    if limit_match:
        try:
            lower_str = limit_match.group(1).replace("**", "^")
            upper_str = limit_match.group(2).replace("**", "^")
            lower_limit = smart_sympify(lower_str, local_dict)
            upper_limit = smart_sympify(upper_str, local_dict)
            is_definite = True
            expr_str = expr_str.replace(limit_match.group(0), "int ")
        except Exception:
            pass
            
    if "limit" in expr_str:
        from sympy import limit
        match_limit = re.search(r"limit\s*\(([^,]+),\s*([a-zA-Z]),\s*([^)]+)\)", expr_str)
        
        if match_limit:
            func_str = match_limit.group(1)
            var_name = match_limit.group(2)
            point_str = match_limit.group(3)
            
            var = Symbol(var_name)
            point = smart_sympify(point_str, local_dict)
            func = smart_sympify(func_str, local_dict)
            
            return limit(func, var, point)


    if "int" in expr_str or "∫" in expr_str:
        clean = re.sub(r"int|∫", "", expr_str).strip()
        match_var = re.search(r"d([a-zA-Z])\s*$", clean)
        integration_var = x
        if match_var:
            integration_var = Symbol(match_var.group(1))
            clean = clean[: match_var.start()]

        inner_func = smart_sympify(clean, local_dict)
        if is_definite:
            return integrate(inner_func, (integration_var, lower_limit, upper_limit))
        return integrate(inner_func, integration_var)

    if "∂" in expr_str or "d/dx" in expr_str:
        clean = re.sub(r"\\frac\{\s*∂\s*\}\{\s*∂\s*[a-zA-Z]\s*\}|d/d[a-zA-Z]", "", expr_str)
        return diff(smart_sympify(clean, local_dict), x)
    return None
# -----








# Bloco 5: Rota de API (/api/calculate)
# -----
@router.post("/api/calculate")
async def handle_calculate(request: CalculationRequest):
    print("--- Cálculo Recebido ---")
    print(f"Expressão Bruta: {request.expression}")
    print(f"Variáveis Recebidas: {request.variables}")

    # Mensagem de erro genérica padrão
    user_msg_generic = r"\color{#ef4444}{\text{Erro: Verifique a sintaxe da expressão e as variáveis.}}"

    try:
        raw_expr = request.expression
        raw_vars = request.variables or {}
        subs_dict = {}

        # 1. Constrói o Dicionário de Substituição (subs_dict)
        for key, value in raw_vars.items():
            if value:
                var_key = key.replace(" ", "_")
                clean_val = str(value).replace(",", ".")

                try:
                    subs_dict[Symbol(var_key)] = float(clean_val)
                except ValueError:
                    try:
                        subs_dict[Symbol(var_key)] = smart_sympify(clean_val)
                    except Exception:
                        subs_dict[Symbol(var_key)] = Symbol(clean_val)

        expr_str = preprocess_expression(raw_expr)
        if not expr_str:
            raise ValueError("Expressão vazia.")

        print(f"Expressão Processada (SymPy): {expr_str}")
        print(f"Dicionário de Substituição (SymPy): {subs_dict}")

        result = handle_calculus_commands(expr_str, local_dict=subs_dict)

        if result is None:
            if "=" in expr_str:
                parts = expr_str.split("=", 1)
                lhs_str = parts[0].strip()
                rhs_str = parts[1].strip()

                # Aplica substituições aqui para avaliar a fórmula
                lhs = smart_sympify(lhs_str, subs_dict)
                rhs = smart_sympify(rhs_str, subs_dict)
                eq = Eq(lhs, rhs)
                
                # REFORÇO CRÍTICO: Aplica substituições de variáveis antes de tentar o solve
                eq_substituted = eq.subs(subs_dict)

                free_syms = list(eq_substituted.free_symbols)
                # Símbolos que são livres na equação APÓS a substituição de valores
                syms_to_solve = [s for s in free_syms]
                
                
                # Se ainda houver símbolos a resolver (indicando uma equação simbólica restante)
                if syms_to_solve:
                    
                    try:
                        # Tenta resolver para o primeiro símbolo livre restante
                        res = solve(eq_substituted, syms_to_solve[0])
                    except Exception:
                        # Se o solve falhar, retorna o erro genérico.
                        return JSONResponse(status_code=400, content={"error": user_msg_generic})
                        
                    sol_list = []
                    for sol in res:
                        simplified_s = simplify(sol)
                        
                        # A avaliação deve ocorrer antes do latex para garantir que resultados numéricos sejam formatados
                        if (
                            hasattr(simplified_s, "is_number")
                            and simplified_s.is_number
                        ):
                            try:
                                value_to_latex = simplified_s.evalf(6)
                            except Exception:
                                value_to_latex = simplified_s
                            # Formata o decimal usando VÍRGULA
                            sol_list.append(latex(value_to_latex).replace(".", ","))
                        else:
                            # Formata o decimal usando VÍRGULA
                            sol_list.append(latex(simplified_s).replace(".", ","))

                    # CRÍTICO: Une a lista usando PONTO E VÍRGULA
                    result_latex = f"{latex(syms_to_solve[0])} = {'; '.join(sol_list)}"
                    
                    # ATIVAÇÃO CRÍTICA: Chama a função de plotagem para o resultado simbólico
                    # Assumimos que o resultado simbólico de `solve` não deve ser plotado diretamente
                    plot_data = None 
                    
                    return {"result_latex": result_latex, "plot_data": plot_data}

                # Se não houver símbolos livres restantes, avalia a veracidade da igualdade (True/False)
                is_true = eq.evalf()
                
                if getattr(is_true, "is_Relational", False):
                    is_true = is_true.args[0] == is_true.args[1]
                
                return {
                    "result_latex": "\\text{Verdadeiro}" if is_true == True else "\\text{Falso}",
                    "plot_data": None,
                }
            else:
                # Se não for equação, resolve diretamente
                result = smart_sympify(expr_str, local_dict=subs_dict)

        # Se houver substituições, aplica-as
        if subs_dict and hasattr(result, "subs"):
            result = result.subs(subs_dict)

        if hasattr(result, "simplify"):
            result = simplify(result)

        is_integral_cmd = ("int" in raw_expr or "∫" in raw_expr)
        is_result_numeric = hasattr(result, "is_number") and result.is_number

        if is_result_numeric and not result.is_integer:
            # Formata o decimal usando VÍRGULA
            result_latex = latex(result.evalf(6)).replace(".", ",")
        else:
            # CORREÇÃO CRÍTICA: Aplica .replace(".", ",") ao resultado geral se não for numérico/inteiro
            result_latex = latex(result).replace(".", ",")

        if (
            is_integral_cmd
            and not is_result_numeric
            and "+ C" not in result_latex
            and result_latex != "0"
        ):
            result_latex += " + C"

        print(f"Resultado Final (SymPy): {result}")
        print(f"Resultado Final (LaTeX): {result_latex}")

        # ATIVAÇÃO CRÍTICA: Chama a função de plotagem para a expressão final
        plot_data = generate_plot_data(result)

        return {"result_latex": result_latex, "plot_data": plot_data}

    except Exception as exc:
        print(f"ERRO CRÍTICO NO HANDLER: {exc}")
        return JSONResponse(status_code=400, content={"error": user_msg_generic})
# -----






# Bloco 6: Rota de Index (/)
# -----
@router.get("/", response_class=HTMLResponse, name="solver_index")
async def solver_index(request: Request):
    context = {
        "request": request,
        "app_title": "Solver Engenharia",
        "app_icon": "calculate",
        "app_path": "/solver",
    }
    return templates.TemplateResponse("index.html", context)
# -----




