# backend/rag_config.py

# Gemini threshold: safe mode
# For now you asked: 0.55–0.60 returns null, so MIN_RETURN == MIN_AUTOFILL.
MIN_CONFIDENCE_TO_AUTOFILL = 0.60
MIN_CONFIDENCE_TO_RETURN_VALUE = 0.60

# Only call Gemini when canonical mapping is weak
CANONICAL_CONFIDENCE_STRONG = 0.75

# How much evidence we send to Gemini
MAX_FACTS_TO_SEND = 10
MAX_CHUNKS_TO_SEND = 8

# Resume chunking
RESUME_CHUNK_SIZE = 900
RESUME_CHUNK_OVERLAP = 150
