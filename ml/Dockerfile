
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY train.py .
COPY predict.py .

RUN mkdir -p /app/models

EXPOSE 5000

CMD ["python", "predict.py"]
