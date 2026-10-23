# Python 3.10 (concrete-fhe için en stabil sürüm)
FROM python:3.10

# Çalışma dizinini belirle
WORKDIR /app

# Tüm dosyaları container içine kopyala
COPY . /app

# Gerekli Python kütüphanelerini kur (requirements.txt olmadığı için manuel yazıyoruz)
RUN pip install --no-cache-dir concrete-python z3-solver fastapi uvicorn requests python-multipart pandas openpyxl git+https://github.com/tolgabuyuktanir/concrete-fhe-toolkit.git