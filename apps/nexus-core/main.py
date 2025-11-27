# Bloco 1: Importações e Configuração Inicial
# -----
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os
import sys
from pathlib import Path
import uvicorn

# =============================================
# CONFIGURAÇÃO DE CAMINHO
# =============================================
ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# =============================================
# IMPORT DOS MICROAPPS
# =============================================
from apps.solver.app.main import router as solver_router, register_static as register_solver_static
from apps.unit_converter.app.main import router as converter_router
from apps.beam_analysis.app.main import router as beam_router
from apps.memorial.app.main import router as memorial_router
# -----




# Bloco 2: CORE e Montagem de Estáticos do Shell/Shared
# -----
app = FastAPI(title="NEXUS Platform v1.0")

current_dir = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(current_dir, "static")
templates_dir = os.path.join(current_dir, "templates")

app.mount("/static", StaticFiles(directory=static_dir), name="static")
shared_ui_dir = ROOT_DIR / "shared-lib" / "ui-components"
functions_panel_dir = shared_ui_dir / "functions-panel"
if functions_panel_dir.is_dir():
    app.mount(
        "/ui/functions-panel",
        StaticFiles(directory=str(functions_panel_dir)),
        name="functions_panel_static",
    )
templates = Jinja2Templates(directory=templates_dir)
# -----




# Bloco 3: Funções de Montagem de Estáticos dos Microapps
# -----
def mount_microapp_static(app_name: str):
    path = os.path.normpath(
        os.path.join(current_dir, "..", app_name, "app", "static")
    )

    if os.path.isdir(path):
        app.mount(
            f"/{app_name}/static",
            StaticFiles(directory=path),
            name=f"{app_name}_static"
        )

mount_microapp_static("solver")
mount_microapp_static("unit_converter")
mount_microapp_static("beam_analysis")
mount_microapp_static("memorial")

# =============================================
# ROTAS DE MICROAPPS (Necessário para StaticFiles)
# =============================================
register_solver_static(app) # Isso é redundante com mount_microapp_static, mas mantido.
# -----




# Bloco 4: Inclusão de Rotas dos Microapps
# -----
app.include_router(solver_router, prefix="/solver")
app.include_router(converter_router, prefix="/unit_converter") # ALTERADO: Prefixado para /unit_converter
app.include_router(beam_router, prefix="/beam")
app.include_router(memorial_router, prefix="/memorial")
# -----




# Bloco 5: Funções de Renderização e Rotas do Core
# -----
def render_page(request: Request, page: str, title: str, icon: str, path: str):
    return templates.TemplateResponse(
        f"pages/{page}",
        {
            "request": request,
            "app_title": title,
            "app_icon": icon,
            "app_path": path
        }
    )

@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    return render_page(request, "dashboard.html", "Dashboard", "dashboard", "/")

@app.get("/library", response_class=HTMLResponse)
async def library_page(request: Request):
    return render_page(request, "library.html", "Biblioteca", "archive", "/library")

@app.get("/profile", response_class=HTMLResponse)
async def profile_page(request: Request):
    return render_page(request, "profile.html", "Meu Perfil", "account_circle", "/profile")
# -----




# Bloco 6: Execução Local
# -----
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
# -----