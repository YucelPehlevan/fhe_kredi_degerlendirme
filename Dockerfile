# Python 3.10 (concrete-fhe için en stabil sürüm)
FROM python:3.10

# Çalışma dizinini belirle
WORKDIR /app

COPY requirements.txt .

# Gerekli Python kütüphanelerini kur (requirements.txt)
RUN pip install --no-cache-dir -r requirements.txt

# Tüm dosyaları container içine kopyala
COPY . /app

