import urllib.request
import json
from urllib.error import HTTPError

url = 'http://127.0.0.1:8000/api/predict/patient/los'
data = {
    "age": 45,
    "gender": "male",
    "disease": "Cardiac",
    "admission_type": "Emergency",
    "history": True,
    "bp": 130,
    "sugar": 150
}
req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')

try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode())
except HTTPError as e:
    print(f"HTTP ERROR: {e.code}")
    print(e.read().decode())
except Exception as e:
    print(f"OTHER ERROR: {e}")
