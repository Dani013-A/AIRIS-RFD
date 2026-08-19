from fastapi.testclient import TestClient
from main import app
import json

client = TestClient(app)

print("--- Testing GET / ---")
response = client.get("/")
print("Status:", response.status_code)
print("Response:", response.json())

print("\n--- Testing POST /analyze ---")
dummy_resume = {
    "rawText": "John Doe\njohn@example.com\nSoftware Engineer\nSkills: Python, SQL, React",
    "parsedSections": {
        "ContactInformation": "John Doe\njohn@example.com",
        "WorkExperience": "Software Engineer 2020-2023",
        "Skills": "Python, SQL, React"
    },
    "targetPosition": "Software Engineer"
}

try:
    response = client.post("/analyze", json=dummy_resume)
    print("Status:", response.status_code)
    print("Keys in response:", list(response.json().keys()))
    if response.status_code == 200:
        print("atsScore:", response.json().get("atsScore", {}))
except Exception as e:
    print("Error during /analyze:", e)
