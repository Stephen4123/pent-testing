import requests

url = 'http://localhost:8000/api/scans'
data = {
    'target_url': 'http://example.com',
    'profile': 'full',
    'options': {}
}

response = requests.post(url, json=data)
print(response.status_code)
print(response.text)
