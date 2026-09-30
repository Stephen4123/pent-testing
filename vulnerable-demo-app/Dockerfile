FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y openssl

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Generate a self-signed certificate on startup to trigger SSL warnings
RUN openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -sha256 -days 365 -nodes -subj "/C=US/ST=CA/L=SF/O=VulnerableApp/CN=localhost"

EXPOSE 8080
EXPOSE 8443

CMD ["python", "app.py"]
