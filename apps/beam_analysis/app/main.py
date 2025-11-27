# --- Beam Analysis Micro-App ---
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import os

router = APIRouter(tags=["Beam Analysis"])

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(BASE_DIR, "templates")
STATIC_DIR = os.path.join(BASE_DIR, "static")

templates = Jinja2Templates(directory=[TEMPLATE_DIR])

def register_static(app):
    if os.path.isdir(STATIC_DIR):
        app.mount("/beam/static", StaticFiles(directory=STATIC_DIR), name="beam_static")


@router.get("/", response_class=HTMLResponse)
async def beam_index(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "url_for": request.app.url_path_for
        }
    )
