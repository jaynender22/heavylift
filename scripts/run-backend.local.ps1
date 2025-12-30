# --- Vertex AI / Gemini (ADC via service account key) ---
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\Users\jay22\Desktop\Repos\keys\heavylift-482613-940884738b59.json"
$env:GOOGLE_CLOUD_PROJECT="heavylift-482613"
$env:GOOGLE_CLOUD_LOCATION="us-central1"
$env:GOOGLE_GENAI_USE_VERTEXAI="True"

# --- Start backend ---
Set-Location "$PSScriptRoot\..\heavylift\backend"

# Activate venv (adjust if your venv path is different)
.\.venv\Scripts\Activate.ps1

# Run FastAPI (adjust module path if yours differs)
uvicorn app:app --reload --port 8000
