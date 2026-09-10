FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 NUMBA_NUM_THREADS=2 \
    NUMBA_CACHE_DIR=/tmp/numba OMP_NUM_THREADS=2 TOKENIZERS_PARALLELISM=false
COPY requirements.txt ./
RUN pip install --no-cache-dir torch==2.14.0 --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt
COPY app.py model.py ./
COPY artifacts/ ./artifacts/
RUN useradd --create-home demo && chown -R demo:demo /app
USER demo
CMD ["sh", "-c", "exec uvicorn app:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1 --no-access-log --no-proxy-headers"]
