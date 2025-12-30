import os
from google import genai

PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT")
LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")

if not PROJECT:
    raise RuntimeError("GOOGLE_CLOUD_PROJECT is not set in this terminal.")
if not LOCATION:
    raise RuntimeError("GOOGLE_CLOUD_LOCATION is not set in this terminal.")

client = genai.Client(vertexai=True, project=PROJECT, location=LOCATION)

resp = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Reply with the word OK."
)

print(resp.text)
