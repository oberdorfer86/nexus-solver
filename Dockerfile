# Bloco 1: Configuração Base e Diretório
# -----
# ==============================
# DOCKERFILE OFICIAL DO NEXUS
# ==============================

FROM python:3.11-slim

# Evitar problemas com buffer
ENV PYTHONUNBUFFERED=1

# Criar diretório da aplicação e definir como WORKDIR
# Alterado de /app para /code para alinhamento com docker-compose.yml
WORKDIR /code
# -----




# Bloco 2: Instalação de Dependências
# -----
# Copiar requirements primeiro para usar cache
COPY requirements.txt /code/requirements.txt

# Instalar dependências
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copiar todo o restante do projeto
COPY . /code
# -----




# Bloco 3: Comando de Execução Modular
# -----
# Expor a porta do FastAPI
EXPOSE 8000

# Rodar a aplicação: Usa a variável de ambiente APP_MODULE_PATH (definida em .env)
# para carregar o módulo correto (ex: apps.nexus-core.main:app).
CMD ["uvicorn", "$APP_MODULE_PATH", "--host", "0.0.0.0", "--port", "8000"]
# -----




