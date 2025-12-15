"use strict";
// src/popup.ts
const PROFILE_KEY = "heavylift_profile";
const PREFERENCES_KEY = "heavylift_preferences";
const BACKEND_URL = "http://127.0.0.1:8000";
// ---------- UI elements ----------
// Top actions
const scanBtn = document.getElementById("scanBtn");
const testFillBtn = document.getElementById("testFillBtn");
const fillProfileBtn = document.getElementById("fillProfileBtn");
const fieldList = document.getElementById("fieldList");
const statusEl = document.getElementById("status");
// Tabs
const tabProfileBtn = document.getElementById("tabProfileBtn");
const tabPrefsBtn = document.getElementById("tabPrefsBtn");
const profilePanel = document.getElementById("tab-profile");
const prefsPanel = document.getElementById("tab-preferences");
function setActiveTab(tab) {
    if (!tabProfileBtn || !tabPrefsBtn || !profilePanel || !prefsPanel)
        return;
    const profileActive = tab === "profile";
    tabProfileBtn.classList.toggle("active", profileActive);
    tabPrefsBtn.classList.toggle("active", !profileActive);
    profilePanel.classList.toggle("active", profileActive);
    prefsPanel.classList.toggle("active", !profileActive);
}
// Profile inputs
const firstNameInput = document.getElementById("profileFirstName");
const middleNameInput = document.getElementById("profileMiddleName");
const lastNameInput = document.getElementById("profileLastName");
const preferredNameInput = document.getElementById("profilePreferredName");
const fullNameInput = document.getElementById("profileFullName");
const emailInput = document.getElementById("profileEmail");
const phoneMobileInput = document.getElementById("profilePhoneMobile");
const phoneHomeInput = document.getElementById("profilePhoneHome");
const phoneWorkInput = document.getElementById("profilePhoneWork");
const cityInput = document.getElementById("profileCity");
const stateInput = document.getElementById("profileState");
const countryInput = document.getElementById("profileCountry");
const postalCodeInput = document.getElementById("profilePostalCode");
const locationCombinedInput = document.getElementById("profileLocationCombined");
const linkedInInput = document.getElementById("profileLinkedIn");
const githubInput = document.getElementById("profileGithub");
const portfolioInput = document.getElementById("profilePortfolio");
const currentCompanyInput = document.getElementById("profileCurrentCompany");
const currentTitleInput = document.getElementById("profileCurrentTitle");
const yearsTotalInput = document.getElementById("profileYearsTotal");
const yearsRelevantInput = document.getElementById("profileYearsRelevant");
const educationLevelInput = document.getElementById("profileEducationLevel");
const fieldOfStudyInput = document.getElementById("profileFieldOfStudy");
const institutionNameInput = document.getElementById("profileInstitutionName");
const graduationYearInput = document.getElementById("profileGraduationYear");
// Demographic-ish profile fields
const dateOfBirthInput = document.getElementById("profileDateOfBirth");
const raceEthnicityInput = document.getElementById("profileRaceEthnicity");
const genderInput = document.getElementById("profileGender");
const disabilityStatusInput = document.getElementById("profileDisabilityStatus");
const veteranStatusInput = document.getElementById("profileVeteranStatus");
const sexualOrientationInput = document.getElementById("profileSexualOrientation");
const criminalHistoryInput = document.getElementById("profileCriminalHistory");
// Preferences inputs
const workAuthCountryInput = document.getElementById("prefWorkAuthCountry");
const workAuthUSInput = document.getElementById("prefWorkAuthUS");
const needSponsorshipInput = document.getElementById("prefNeedSponsorship");
const eligibleCountryInput = document.getElementById("prefEligibleCountry");
const preferredLocationInput = document.getElementById("prefPreferredLocation");
const relocateInput = document.getElementById("prefRelocate");
const onSiteOkInput = document.getElementById("prefOnSiteOk");
const hybridOkInput = document.getElementById("prefHybridOk");
const travelMaxInput = document.getElementById("prefTravelMax");
const noticePeriodInput = document.getElementById("prefNoticePeriod");
const earliestStartInput = document.getElementById("prefEarliestStart");
const salaryExpectationsInput = document.getElementById("prefSalaryExpectations");
const hourlyRateInput = document.getElementById("prefHourlyRate");
// Buttons
const saveProfileBtn = document.getElementById("saveProfileBtn");
const savePreferencesBtn = document.getElementById("savePreferencesBtn");
// ---------- State ----------
let currentFields = [];
let currentClassifications = [];
// ---------- Storage helpers ----------
function loadProfile() {
    return new Promise((resolve) => {
        chrome.storage.local.get(PROFILE_KEY, (result) => {
            const raw = result[PROFILE_KEY];
            if (!raw) {
                resolve(null);
                return;
            }
            resolve(raw);
        });
    });
}
function saveProfile(profile) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [PROFILE_KEY]: profile }, () => {
            resolve();
        });
    });
}
function buildProfileFromInputs() {
    const firstName = firstNameInput.value.trim();
    const middleName = middleNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const fullName = fullNameInput.value.trim() ||
        [firstName, middleName, lastName].filter(Boolean).join(" ");
    const city = cityInput.value.trim();
    const state = stateInput.value.trim();
    const country = countryInput.value.trim();
    const locationCombined = locationCombinedInput.value.trim() ||
        [city, state, country].filter(Boolean).join(", ");
    return {
        firstName,
        middleName,
        lastName,
        preferredName: preferredNameInput.value.trim(),
        fullName,
        email: emailInput.value.trim(),
        phoneMobile: phoneMobileInput.value.trim(),
        phoneHome: phoneHomeInput.value.trim(),
        phoneWork: phoneWorkInput.value.trim(),
        city,
        state,
        country,
        postalCode: postalCodeInput.value.trim(),
        locationCombined,
        linkedIn: linkedInInput.value.trim(),
        github: githubInput.value.trim(),
        portfolio: portfolioInput.value.trim(),
        currentCompany: currentCompanyInput.value.trim(),
        currentTitle: currentTitleInput.value.trim(),
        yearsTotal: yearsTotalInput.value.trim(),
        yearsRelevant: yearsRelevantInput.value.trim(),
        educationLevel: educationLevelInput.value.trim(),
        fieldOfStudy: fieldOfStudyInput.value.trim(),
        institutionName: institutionNameInput.value.trim(),
        graduationYear: graduationYearInput.value.trim(),
        dateOfBirth: dateOfBirthInput.value.trim(),
        raceEthnicity: raceEthnicityInput.value.trim(),
        gender: genderInput.value.trim(),
        disabilityStatus: disabilityStatusInput.value.trim(),
        veteranStatus: veteranStatusInput.value.trim(),
        sexualOrientation: sexualOrientationInput.value.trim(),
        criminalHistory: criminalHistoryInput.value.trim(),
    };
}
function populateProfileInputs(profile) {
    if (!profile)
        return;
    firstNameInput.value = profile.firstName || "";
    middleNameInput.value = profile.middleName || "";
    lastNameInput.value = profile.lastName || "";
    preferredNameInput.value = profile.preferredName || "";
    fullNameInput.value = profile.fullName || "";
    emailInput.value = profile.email || "";
    phoneMobileInput.value = profile.phoneMobile || "";
    phoneHomeInput.value = profile.phoneHome || "";
    phoneWorkInput.value = profile.phoneWork || "";
    cityInput.value = profile.city || "";
    stateInput.value = profile.state || "";
    countryInput.value = profile.country || "";
    postalCodeInput.value = profile.postalCode || "";
    locationCombinedInput.value = profile.locationCombined || "";
    linkedInInput.value = profile.linkedIn || "";
    githubInput.value = profile.github || "";
    portfolioInput.value = profile.portfolio || "";
    currentCompanyInput.value = profile.currentCompany || "";
    currentTitleInput.value = profile.currentTitle || "";
    yearsTotalInput.value = profile.yearsTotal || "";
    yearsRelevantInput.value = profile.yearsRelevant || "";
    educationLevelInput.value = profile.educationLevel || "";
    fieldOfStudyInput.value = profile.fieldOfStudy || "";
    institutionNameInput.value = profile.institutionName || "";
    graduationYearInput.value = profile.graduationYear || "";
    dateOfBirthInput.value = profile.dateOfBirth || "";
    raceEthnicityInput.value = profile.raceEthnicity || "";
    genderInput.value = profile.gender || "";
    disabilityStatusInput.value = profile.disabilityStatus || "";
    veteranStatusInput.value = profile.veteranStatus || "";
    sexualOrientationInput.value = profile.sexualOrientation || "";
    criminalHistoryInput.value = profile.criminalHistory || "";
}
function loadPreferences() {
    return new Promise((resolve) => {
        chrome.storage.local.get(PREFERENCES_KEY, (result) => {
            const raw = result[PREFERENCES_KEY];
            if (!raw) {
                resolve(null);
                return;
            }
            resolve(raw);
        });
    });
}
function savePreferences(prefs) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [PREFERENCES_KEY]: prefs }, () => {
            resolve();
        });
    });
}
function buildPreferencesFromInputs() {
    return {
        workAuthCountry: workAuthCountryInput.value.trim(),
        workAuthUS: workAuthUSInput.value.trim(),
        needSponsorshipFuture: needSponsorshipInput.value.trim(),
        eligibleToWorkInCountryX: eligibleCountryInput.value.trim(),
        preferredLocation: preferredLocationInput.value.trim(),
        willingToRelocate: relocateInput.value.trim(),
        onSiteOk: onSiteOkInput.value.trim(),
        hybridOk: hybridOkInput.value.trim(),
        travelPercentMax: travelMaxInput.value.trim(),
        noticePeriod: noticePeriodInput.value.trim(),
        earliestStartDate: earliestStartInput.value.trim(),
        salaryExpectations: salaryExpectationsInput.value.trim(),
        hourlyRateExpectations: hourlyRateInput.value.trim(),
    };
}
function populatePreferencesInputs(prefs) {
    if (!prefs)
        return;
    workAuthCountryInput.value = prefs.workAuthCountry || "";
    workAuthUSInput.value = prefs.workAuthUS || "";
    needSponsorshipInput.value = prefs.needSponsorshipFuture || "";
    eligibleCountryInput.value = prefs.eligibleToWorkInCountryX || "";
    preferredLocationInput.value = prefs.preferredLocation || "";
    relocateInput.value = prefs.willingToRelocate || "";
    onSiteOkInput.value = prefs.onSiteOk || "";
    hybridOkInput.value = prefs.hybridOk || "";
    travelMaxInput.value = prefs.travelPercentMax || "";
    noticePeriodInput.value = prefs.noticePeriod || "";
    earliestStartInput.value = prefs.earliestStartDate || "";
    salaryExpectationsInput.value = prefs.salaryExpectations || "";
    hourlyRateInput.value = prefs.hourlyRateExpectations || "";
}
// ---------- Tabs wiring (no inline script) ----------
// default tab
setActiveTab("profile");
// ---------- Scanning ----------
function getActiveTab() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (!tab || !tab.id) {
                reject(new Error("No active tab"));
            }
            else {
                resolve(tab);
            }
        });
    });
}
async function scanFields() {
    try {
        const tab = await getActiveTab();
        const req = { type: "SCAN_FIELDS" };
        chrome.tabs.sendMessage(tab.id, req, (response) => {
            const err = chrome.runtime.lastError;
            if (err) {
                console.error("[Heavylift popup] sendMessage error:", err);
                fieldList.innerHTML = `<p>Error talking to page: ${err.message}</p>`;
                return;
            }
            if (!response || !response.fields) {
                fieldList.innerHTML = "<p>Could not read fields on this page.</p>";
                return;
            }
            currentFields = response.fields;
            currentClassifications = []; // reset when fields change
            renderFieldList(currentFields);
        });
    }
    catch (err) {
        console.error("[Heavylift popup] scanFields error:", err);
        fieldList.innerHTML = "<p>Error scanning fields.</p>";
    }
}
function renderFieldList(fields) {
    if (!fields.length) {
        fieldList.innerHTML = "<p>No fields detected.</p>";
        return;
    }
    fieldList.innerHTML = fields
        .map((f) => {
        const label = f.label || "(no label)";
        const metaPieces = [
            f.fieldType,
            f.tagName,
            f.name ? `name="${f.name}"` : "",
            f.placeholder ? `ph="${f.placeholder}"` : "",
        ].filter(Boolean);
        return `
        <div class="field-item">
          <div class="label">${label}</div>
          <div class="meta">${metaPieces.join(" • ")}</div>
        </div>
      `;
    })
        .join("");
}
// ---------- Test fill (demo only for text-like fields) ----------
async function testFill() {
    if (!currentFields.length) {
        await scanFields();
    }
    try {
        const tab = await getActiveTab();
        const values = currentFields
            .filter((f) => ["text", "textarea", "email", "tel", "url", "number"].includes(f.fieldType) && f.htmlType !== "file")
            .map((f) => ({
            fieldId: f.id,
            value: "demo",
        }));
        const req = {
            type: "FILL_FIELDS",
            values,
        };
        chrome.tabs.sendMessage(tab.id, req, (resp) => {
            const err = chrome.runtime.lastError;
            if (err) {
                console.error("[Heavylift popup] sendMessage error (fill):", err);
                return;
            }
            console.log("[Heavylift popup] fill response:", resp);
        });
    }
    catch (err) {
        console.error("[Heavylift popup] testFill error:", err);
    }
}
// ---------- ML classification ----------
async function classifyCurrentFields() {
    if (!currentFields.length) {
        await scanFields();
    }
    try {
        const payload = {
            fields: currentFields.map((f) => ({
                id: f.id,
                label: f.label || "",
                name: f.name || "",
                placeholder: f.placeholder || "",
                tag: f.tagName || "",
                html_type: f.htmlType || "",
                options: f.options || [],
            })),
        };
        const res = await fetch(`${BACKEND_URL}/classify-fields`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            console.error("[Heavylift popup] classify-fields HTTP error:", res.status);
            statusEl.textContent = `Classification error: HTTP ${res.status}`;
            return [];
        }
        const data = (await res.json());
        currentClassifications = data.results || [];
        console.log("[Heavylift popup] classifications:", currentClassifications);
        return currentClassifications;
    }
    catch (err) {
        console.error("[Heavylift popup] classifyCurrentFields error:", err);
        statusEl.textContent = "Error contacting classifier backend.";
        return [];
    }
}
// ---------- Autofill from saved info (profile + preferences) ----------
async function fillFromSavedInfo() {
    const profile = await loadProfile();
    const prefs = await loadPreferences();
    if (!profile && !prefs) {
        statusEl.textContent = "No profile or preferences saved yet.";
        return;
    }
    if (!currentFields.length) {
        await scanFields();
    }
    if (!currentClassifications.length) {
        await classifyCurrentFields();
    }
    if (!currentClassifications.length) {
        statusEl.textContent = "Could not classify fields for autofill.";
        return;
    }
    const values = [];
    for (const info of currentFields) {
        const cls = currentClassifications.find((c) => c.field_id === info.id && c.autofill_allowed);
        if (!cls)
            continue;
        let value = null;
        if (cls.source.startsWith("profile.")) {
            switch (cls.source) {
                case "profile.firstName":
                    value = profile?.firstName || null;
                    break;
                case "profile.middleName":
                    value = profile?.middleName || null;
                    break;
                case "profile.lastName":
                    value = profile?.lastName || null;
                    break;
                case "profile.preferredName":
                    value = profile?.preferredName || null;
                    break;
                case "profile.fullName":
                    value =
                        profile?.fullName ||
                            [profile?.firstName, profile?.middleName, profile?.lastName]
                                .filter(Boolean)
                                .join(" ");
                    break;
                case "profile.email":
                    value = profile?.email || null;
                    break;
                case "profile.phoneMobile":
                    value = profile?.phoneMobile || null;
                    break;
                case "profile.phoneHome":
                    value = profile?.phoneHome || null;
                    break;
                case "profile.phoneWork":
                    value = profile?.phoneWork || null;
                    break;
                case "profile.city":
                    value = profile?.city || null;
                    break;
                case "profile.state":
                    value = profile?.state || null;
                    break;
                case "profile.country":
                    value = profile?.country || null;
                    break;
                case "profile.postalCode":
                    value = profile?.postalCode || null;
                    break;
                case "profile.locationCombined":
                    value =
                        profile?.locationCombined ||
                            [profile?.city, profile?.state, profile?.country]
                                .filter(Boolean)
                                .join(", ");
                    break;
                case "profile.linkedIn":
                    value = profile?.linkedIn || null;
                    break;
                case "profile.github":
                    value = profile?.github || null;
                    break;
                case "profile.portfolio":
                    value = profile?.portfolio || null;
                    break;
                case "profile.currentCompany":
                    value = profile?.currentCompany || null;
                    break;
                case "profile.currentTitle":
                    value = profile?.currentTitle || null;
                    break;
                case "profile.yearsTotal":
                    value = profile?.yearsTotal || null;
                    break;
                case "profile.yearsRelevant":
                    value = profile?.yearsRelevant || null;
                    break;
                case "profile.educationLevel":
                    value = profile?.educationLevel || null;
                    break;
                case "profile.fieldOfStudy":
                    value = profile?.fieldOfStudy || null;
                    break;
                case "profile.institutionName":
                    value = profile?.institutionName || null;
                    break;
                case "profile.graduationYear":
                    value = profile?.graduationYear || null;
                    break;
                // Demographic fields (now allowed to autofill)
                case "profile.dateOfBirth":
                    value = profile?.dateOfBirth || null;
                    break;
                case "profile.raceEthnicity":
                    value = profile?.raceEthnicity || null;
                    break;
                case "profile.gender":
                    value = profile?.gender || null;
                    break;
                case "profile.disabilityStatus":
                    value = profile?.disabilityStatus || null;
                    break;
                case "profile.veteranStatus":
                    value = profile?.veteranStatus || null;
                    break;
                case "profile.sexualOrientation":
                    value = profile?.sexualOrientation || null;
                    break;
                case "profile.criminalHistory":
                    value = profile?.criminalHistory || null;
                    break;
                default:
                    value = null;
            }
        }
        else if (cls.source.startsWith("preferences.") && prefs) {
            switch (cls.source) {
                case "preferences.workAuthCountry":
                    value = prefs.workAuthCountry || null;
                    break;
                case "preferences.workAuthUS":
                    value = prefs.workAuthUS || null;
                    break;
                case "preferences.needSponsorshipFuture":
                    value = prefs.needSponsorshipFuture || null;
                    break;
                case "preferences.eligibleToWorkInCountryX":
                    value = prefs.eligibleToWorkInCountryX || null;
                    break;
                case "preferences.preferredLocation":
                    value = prefs.preferredLocation || null;
                    break;
                case "preferences.willingToRelocate":
                    value = prefs.willingToRelocate || null;
                    break;
                case "preferences.onSiteOk":
                    value = prefs.onSiteOk || null;
                    break;
                case "preferences.hybridOk":
                    value = prefs.hybridOk || null;
                    break;
                case "preferences.travelPercentMax":
                    value = prefs.travelPercentMax || null;
                    break;
                case "preferences.noticePeriod":
                    value = prefs.noticePeriod || null;
                    break;
                case "preferences.earliestStartDate":
                    value = prefs.earliestStartDate || null;
                    break;
                case "preferences.salaryExpectations":
                    value = prefs.salaryExpectations || null;
                    break;
                case "preferences.hourlyRateExpectations":
                    value = prefs.hourlyRateExpectations || null;
                    break;
                default:
                    value = null;
            }
        }
        if (!value)
            continue;
        if (info.htmlType === "file")
            continue;
        const allowedTypes = [
            "text",
            "textarea",
            "email",
            "tel",
            "url",
            "number",
            "select",
            "radio",
        ];
        if (!allowedTypes.includes(info.fieldType))
            continue;
        values.push({
            fieldId: info.id,
            value,
        });
    }
    if (!values.length) {
        statusEl.textContent = "No fields on this page matched your saved info.";
        return;
    }
    try {
        const tab = await getActiveTab();
        const req = {
            type: "FILL_FIELDS",
            values,
        };
        chrome.tabs.sendMessage(tab.id, req, (resp) => {
            const err = chrome.runtime.lastError;
            if (err) {
                console.error("[Heavylift popup] sendMessage error (profile fill):", err);
                statusEl.textContent = `Error filling from saved info: ${err.message}`;
                return;
            }
            console.log("[Heavylift popup] fill response:", resp);
            statusEl.textContent = `Filled ${values.length} field(s) from saved info.`;
        });
    }
    catch (err) {
        console.error("[Heavylift popup] fillFromSavedInfo error:", err);
        statusEl.textContent = "Error filling from saved info.";
    }
}
// ---------- Event wiring ----------
scanBtn.addEventListener("click", () => {
    scanFields();
});
testFillBtn.addEventListener("click", () => {
    testFill();
});
fillProfileBtn.addEventListener("click", () => {
    fillFromSavedInfo();
});
saveProfileBtn.addEventListener("click", async () => {
    const profile = buildProfileFromInputs();
    await saveProfile(profile);
    statusEl.textContent = "Profile saved.";
});
savePreferencesBtn.addEventListener("click", async () => {
    const prefs = buildPreferencesFromInputs();
    await savePreferences(prefs);
    statusEl.textContent = "Preferences saved.";
});
// Tab buttons
tabProfileBtn?.addEventListener("click", () => setActiveTab("profile"));
tabPrefsBtn?.addEventListener("click", () => setActiveTab("preferences"));
// ---------- Init on popup open ----------
loadProfile().then((profile) => {
    populateProfileInputs(profile);
});
loadPreferences().then((prefs) => {
    populatePreferencesInputs(prefs);
});
scanFields();
//# sourceMappingURL=popup.js.map