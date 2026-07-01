FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .
COPY static ./static

ENV PORT=8080
EXPOSE 8080

CMD exec gunicorn --bind :${PORT} --workers 1 --threads 8 --timeout 120 server:app