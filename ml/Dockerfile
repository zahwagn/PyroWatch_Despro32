
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY pyro_core.py scenario_sim.py advisor.py train.py predict.py test_scenarios.py ./

RUN mkdir -p /app/models

EXPOSE 5000

CMD ["python", "predict.py"]
