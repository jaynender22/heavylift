# backend/schema.py

from typing import List, Dict

# Canonical fields Heavylift understands today
CANONICAL_FIELDS: List[Dict] = [
    {
        "key": "FULL_NAME",
        "description": "The candidate's full name as one string, e.g. 'John Doe'.",
        "source": "profile.fullName",
        "sensitive": False,
    },
    {
        "key": "EMAIL",
        "description": "The candidate's primary email address.",
        "source": "profile.email",
        "sensitive": False,
    },
    {
        "key": "PHONE",
        "description": "The candidate's main phone or mobile number.",
        "source": "profile.phone",
        "sensitive": False,
    },
    {
        "key": "CURRENT_LOCATION",
        "description": "The place where the candidate is currently based, usually city and country.",
        "source": "profile.location",
        "sensitive": False,
    },
    {
        "key": "LINKEDIN_URL",
        "description": "The URL of the candidate's LinkedIn profile.",
        "source": "profile.linkedIn",
        "sensitive": False,
    },
    {
        "key": "GITHUB_URL",
        "description": "The URL of the candidate's GitHub profile.",
        "source": "profile.github",
        "sensitive": False,
    },
    {
        "key": "PORTFOLIO_URL",
        "description": "The URL of the candidate's personal website or portfolio.",
        "source": "profile.portfolio",
        "sensitive": False,
    },
    {
        "key": "UNKNOWN",
        "description": "Field that should not be autofilled or does not map to known profile data.",
        "source": "none",
        "sensitive": False,
    },
]
