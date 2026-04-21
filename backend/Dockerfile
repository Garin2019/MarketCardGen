FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --isolated --no-cache-dir --default-timeout=1000 -r requirements.txt

COPY . .

RUN mkdir -p /app/data/uploads

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
