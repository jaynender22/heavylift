from gemini_decider import decide_with_structured_output

decision = decide_with_structured_output(
    field_question="Preferred First Name",
    field_type="text",
    options=[],
    candidate_facts=[
        {"key": "profile.firstName", "label": "First Name", "value": "Bhargav", "score": 0.91},
        {"key": "profile.lastName", "label": "Last Name", "value": "Patel", "score": 0.40},
    ],
    candidate_chunks=[
        {"chunk_id": 12, "text": "Bhargav Patel\nEmail: ...", "score": 0.55}
    ],
)

print(decision.model_dump())
