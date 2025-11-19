# 1. Imagem Base
FROM python:3.10-slim

# 2. Define o diretório de trabalho
WORKDIR /code

# 3. Copia e instala as dependências
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# 4. Copia a aplicação
# Copia a pasta 'app' local para a pasta '/code/app' no container
COPY ./app /code/app

# 5. Expõe a porta
EXPOSE 8000

# 6. Comando Padrão
# Este comando será sobrescrito pelo docker-compose, mas é bom tê-lo.
# Ele espera que o app esteja em /code/app/main.py
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]