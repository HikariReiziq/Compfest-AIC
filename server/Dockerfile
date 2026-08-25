FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy AI engine models and server code
COPY ai_engine /app/ai_engine
COPY server /app/server

ENV PYTHONPATH=/app:/app/ai_engine

# Jalankan sebagai pengguna biasa, bukan root.
#
# Ini lapisan penahan yang paling menentukan: bila proses di dalam container
# berhasil dieksploitasi, penyerang mewarisi hak pengguna ini, bukan root.
# Root di dalam container adalah root yang sama dengan host pada banyak jalur
# escape, jadi menjalankannya sebagai root menghapus sebagian besar manfaat
# isolasi yang diberikan container.
RUN useradd --create-home --shell /usr/sbin/nologin --uid 10001 coba \
    && chown -R coba:coba /app
USER coba

EXPOSE 8000

CMD ["uvicorn", "server.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
