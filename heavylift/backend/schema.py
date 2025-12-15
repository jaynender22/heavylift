# backend/schema.py
from typing import List, Dict

CANONICAL_FIELDS: List[Dict] = [
    # --------- Basic identity (profile) ---------
    {
        "key": "FIRST_NAME",
        "description": "The candidate's first or given name.",
        "source": "profile.firstName",
        "sensitive": False,
    },
    {
        "key": "MIDDLE_NAME",
        "description": "The candidate's middle name or initial.",
        "source": "profile.middleName",
        "sensitive": False,
    },
    {
        "key": "LAST_NAME",
        "description": "The candidate's last, family, or surname.",
        "source": "profile.lastName",
        "sensitive": False,
    },
    {
        "key": "FULL_NAME",
        "description": "The candidate's full name as one string, e.g. 'John Doe'.",
        "source": "profile.fullName",
        "sensitive": False,
    },
    {
        "key": "PREFERRED_NAME",
        "description": "The candidate's preferred name or nickname.",
        "source": "profile.preferredName",
        "sensitive": False,
    },

    # --------- Contact (profile) ---------
    {
        "key": "EMAIL",
        "description": "The candidate's primary email address.",
        "source": "profile.email",
        "sensitive": False,
    },
    {
        "key": "PHONE_MOBILE",
        "description": "The candidate's main mobile phone number.",
        "source": "profile.phoneMobile",
        "sensitive": False,
    },
    {
        "key": "PHONE_HOME",
        "description": "The candidate's home phone number.",
        "source": "profile.phoneHome",
        "sensitive": False,
    },
    {
        "key": "PHONE_WORK",
        "description": "The candidate's work phone number.",
        "source": "profile.phoneWork",
        "sensitive": False,
    },

    # --------- Location (profile) ---------
    {
        "key": "CITY",
        "description": "The city where the candidate currently lives.",
        "source": "profile.city",
        "sensitive": False,
    },
    {
        "key": "STATE",
        "description": "The state, province, or region where the candidate lives.",
        "source": "profile.state",
        "sensitive": False,
    },
    {
        "key": "COUNTRY",
        "description": "The country where the candidate lives.",
        "source": "profile.country",
        "sensitive": False,
    },
    {
        "key": "POSTAL_CODE",
        "description": "The candidate's postal or ZIP code.",
        "source": "profile.postalCode",
        "sensitive": False,
    },
    {
        "key": "CURRENT_LOCATION",
        "description": "Where the candidate is currently based, usually city, state, country.",
        "source": "profile.locationCombined",
        "sensitive": False,
    },

    # --------- Online presence (profile) ---------
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

    # --------- Current role / experience (profile) ---------
    {
        "key": "CURRENT_COMPANY_NAME",
        "description": "The company where the candidate currently works.",
        "source": "profile.currentCompany",
        "sensitive": False,
    },
    {
        "key": "CURRENT_TITLE",
        "description": "The candidate's current job title.",
        "source": "profile.currentTitle",
        "sensitive": False,
    },
    {
        "key": "YEARS_EXPERIENCE_TOTAL",
        "description": "The total years of professional experience the candidate has.",
        "source": "profile.yearsTotal",
        "sensitive": False,
    },
    {
        "key": "YEARS_EXPERIENCE_RELEVANT",
        "description": "Years of experience relevant to the role.",
        "source": "profile.yearsRelevant",
        "sensitive": False,
    },

    # --------- Education (profile) ---------
    {
        "key": "HIGHEST_EDUCATION_LEVEL",
        "description": "Highest level of education completed.",
        "source": "profile.educationLevel",
        "sensitive": False,
    },
    {
        "key": "FIELD_OF_STUDY",
        "description": "The candidate's main field of study or major.",
        "source": "profile.fieldOfStudy",
        "sensitive": False,
    },
    {
        "key": "INSTITUTION_NAME",
        "description": "Name of the institution for the highest degree.",
        "source": "profile.institutionName",
        "sensitive": False,
    },
    {
        "key": "GRADUATION_YEAR",
        "description": "Graduation year for the highest degree.",
        "source": "profile.graduationYear",
        "sensitive": False,
    },

    # --------- Preferences (job / work style) ---------
    {
        "key": "WORK_AUTH_COUNTRY",
        "description": "Primary country where the candidate is authorized to work.",
        "source": "preferences.workAuthCountry",
        "sensitive": False,
    },
    {
        "key": "WORK_AUTH_US",
        "description": "Whether the candidate is authorized to work in the US (yes/no).",
        "source": "preferences.workAuthUS",
        "sensitive": False,
    },
    {
        "key": "NEED_SPONSORSHIP_FUTURE",
        "description": "Whether the candidate will require sponsorship now or in the future (yes/no).",
        "source": "preferences.needSponsorshipFuture",
        "sensitive": False,
    },
    {
        "key": "ELIGIBLE_TO_WORK_IN_COUNTRY_X",
        "description": "Whether the candidate is eligible to work in a specified country.",
        "source": "preferences.eligibleToWorkInCountryX",
        "sensitive": False,
    },
    {
        "key": "PREFERRED_LOCATION",
        "description": "Preferred locations or regions where the candidate would like to work.",
        "source": "preferences.preferredLocation",
        "sensitive": False,
    },
    {
        "key": "WILLING_TO_RELOCATE",
        "description": "Whether the candidate is willing to relocate (yes/no/maybe).",
        "source": "preferences.willingToRelocate",
        "sensitive": False,
    },
    {
        "key": "ON_SITE_OKAY",
        "description": "Whether the candidate is okay with fully on-site work (yes/no).",
        "source": "preferences.onSiteOk",
        "sensitive": False,
    },
    {
        "key": "HYBRID_OKAY",
        "description": "Whether the candidate is okay with hybrid work (yes/no).",
        "source": "preferences.hybridOk",
        "sensitive": False,
    },
    {
        "key": "TRAVEL_PERCENT_MAX",
        "description": "Maximum percentage of time the candidate is willing to travel.",
        "source": "preferences.travelPercentMax",
        "sensitive": False,
    },
    {
        "key": "NOTICE_PERIOD",
        "description": "The candidate's notice period.",
        "source": "preferences.noticePeriod",
        "sensitive": False,
    },
    {
        "key": "EARLIEST_START_DATE",
        "description": "Earliest date when the candidate can start.",
        "source": "preferences.earliestStartDate",
        "sensitive": False,
    },
    {
        "key": "SALARY_EXPECTATIONS",
        "description": "The candidate's salary expectations, e.g. a range and currency.",
        "source": "preferences.salaryExpectations",
        "sensitive": False,
    },
    {
        "key": "HOURLY_RATE_EXPECTATIONS",
        "description": "Expected hourly rate for contract roles.",
        "source": "preferences.hourlyRateExpectations",
        "sensitive": False,
    },

    # --------- Sensitive (exceptions you still store in profile) ---------
    {
        "key": "DATE_OF_BIRTH",
        "description": "The candidate's date of birth.",
        "source": "profile.dateOfBirth",
        "sensitive": False,
    },
    {
        "key": "RACE_ETHNICITY",
        "description": "The candidate's race or ethnicity information.",
        "source": "profile.raceEthnicity",
        "sensitive": False,
    },
    {
        "key": "GENDER",
        "description": "The candidate's gender identity.",
        "source": "profile.gender",
        "sensitive": False,
    },
    {
        "key": "DISABILITY_STATUS",
        "description": "The candidate's disability status.",
        "source": "profile.disabilityStatus",
        "sensitive": False,
    },
    {
        "key": "VETERAN_STATUS",
        "description": "The candidate's veteran status.",
        "source": "profile.veteranStatus",
        "sensitive": False,
    },
    {
        "key": "SEXUAL_ORIENTATION",
        "description": "The candidate's sexual orientation.",
        "source": "profile.sexualOrientation",
        "sensitive": False,
    },
    {
        "key": "CRIMINAL_HISTORY",
        "description": "The candidate's self-reported criminal history.",
        "source": "profile.criminalHistory",
        "sensitive": False,
    },

    # --------- Highly sensitive IDs (never stored / autofilled) ---------
    {
        "key": "SSN_OR_NATIONAL_ID",
        "description": "Social security number or national ID number.",
        "source": "none",
        "sensitive": True,
    },
    {
        "key": "PASSPORT_NUMBER",
        "description": "Passport number or similar travel document identifier.",
        "source": "none",
        "sensitive": True,
    },
    {
        "key": "DRIVERS_LICENSE_NUMBER",
        "description": "Driver's license number.",
        "source": "none",
        "sensitive": True,
    },

    # --------- Long answers (not autofilled from profile; generated per app) ---------
    {
        "key": "LONG_ANSWER_FREEFORM",
        "description": "Long-form free text questions such as motivations, about you, or challenge examples.",
        "source": "none",
        "sensitive": False,
    },

    # --------- Fallback ---------
    {
        "key": "UNKNOWN",
        "description": "Field that should not be autofilled or does not map to known stored data.",
        "source": "none",
        "sensitive": False,
    },
]
