FROM python:3.9-slim-buster

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt 

COPY . .

CMD ["python3", "app.py"]  # Run the Flask app directly
