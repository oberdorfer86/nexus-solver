from fastapi import APIRouter
from fastapi.requests import Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import os

# -----------------------------
# CONFIGURAÇÕES
# -----------------------------
router = APIRouter(tags=["Unit Converter"])

current_dir = os.path.dirname(os.path.abspath(__file__))

template_paths = [
    os.path.join(current_dir, "templates"),
    os.path.normpath(os.path.join(current_dir, "..", "..", "nexus-core", "templates"))
]

templates = Jinja2Templates(directory=template_paths)

# -----------------------------
# ROTAS
# -----------------------------
@router.get("/", response_class=HTMLResponse)
async def converter_index(request: Request):
    """
    Página principal do conversor de unidades.
    """
    context = {
        "request": request,
        "url_for": request.url_for
    }
    return templates.TemplateResponse("index.html", context)
