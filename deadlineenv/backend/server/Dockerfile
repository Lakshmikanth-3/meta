FROM python:3.11-slim

WORKDIR /app

COPY . /app/

RUN pip install --no-cache-dir \
    fastapi \
    "uvicorn[standard]" \
    pydantic \
    httpx \
    openai \
    python-dotenv

# Install openenv-core — must pass validation
RUN pip install --no-cache-dir openenv-core

ENV PYTHONPATH=/app
ENV WORKERS=4

EXPOSE 7860

CMD ["uvicorn", "server.app:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
