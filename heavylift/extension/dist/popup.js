"use strict";
// src/popup.ts
(() => {
    // ---------- Constants ----------
    const PROFILE_KEY = "heavylift_profile";
    const PREFERENCES_KEY = "heavylift_preferences";
    const API_BASE = "http://127.0.0.1:8000";
    const BACKEND_URL = API_BASE;
    // ---------- UI elements (nullable; set on init) ----------
    // Existing buttons/areas
    let scanBtn = null;
    let testFillBtn = null;
    let fillProfileBtn = null;
    let fieldList = null;
    let statusEl = null;
    // Tabs
    let tabProfileBtn = null;
    let tabPrefsBtn = null;
    let profilePanel = null;
    let prefsPanel = null;
    // Profile inputs
    let firstNameInput = null;
    let middleNameInput = null;
    let lastNameInput = null;
    let preferredNameInput = null;
    let fullNameInput = null;
    let emailInput = null;
    let phoneMobileInput = null;
    let phoneHomeInput = null;
    let phoneWorkInput = null;
    let cityInput = null;
    let stateInput = null;
    let countryInput = null;
    let postalCodeInput = null;
    let locationCombinedInput = null;
    let linkedInInput = null;
    let githubInput = null;
    let portfolioInput = null;
    let currentCompanyInput = null;
    let currentTitleInput = null;
    let yearsTotalInput = null;
    let yearsRelevantInput = null;
    let educationLevelInput = null;
    let fieldOfStudyInput = null;
    let institutionNameInput = null;
    let graduationYearInput = null;
    // Demographic-ish profile fields
    let dateOfBirthInput = null;
    let raceEthnicityInput = null;
    let genderInput = null;
    let disabilityStatusInput = null;
    let veteranStatusInput = null;
    let sexualOrientationInput = null;
    let criminalHistoryInput = null;
    // Preferences inputs
    let workAuthCountryInput = null;
    let workAuthUSInput = null;
    let needSponsorshipInput = null;
    let eligibleCountryInput = null;
    let preferredLocationInput = null;
    let relocateInput = null;
    let onSiteOkInput = null;
    let hybridOkInput = null;
    let travelMaxInput = null;
    let noticePeriodInput = null;
    let earliestStartInput = null;
    let salaryExpectationsInput = null;
    let hourlyRateInput = null;
    // Local save buttons
    let saveProfileBtn = null;
    let savePreferencesBtn = null;
    // New backend storage UI
    let profileNameInputEl = null;
    let createProfileBtnEl = null;
    let profilesSelect = null;
    let versionsSelect = null;
    let saveVersionBtnEl = null;
    let loadVersionBtnEl = null;
    let resumeFileInput = null;
    let uploadResumeBtnEl = null;
    let resumeStatus = null;
    // ---------- State ----------
    let currentFields = [];
    let currentClassifications = [];
    // Backend storage state
    let currentResumeId = null;
    let currentProfileId = null;
    let currentVersionId = null;
    // ---------- Small helpers ----------
    function setStatus(msg) {
        if (statusEl)
            statusEl.textContent = msg;
    }
    function setActiveTab(tab) {
        if (!tabProfileBtn || !tabPrefsBtn || !profilePanel || !prefsPanel)
            return;
        const profileActive = tab === "profile";
        tabProfileBtn.classList.toggle("active", profileActive);
        tabPrefsBtn.classList.toggle("active", !profileActive);
        profilePanel.classList.toggle("active", profileActive);
        prefsPanel.classList.toggle("active", !profileActive);
    }
    // ---------- Storage helpers (chrome.storage.local) ----------
    function loadProfile() {
        return new Promise((resolve) => {
            chrome.storage.local.get(PROFILE_KEY, (result) => {
                const raw = result[PROFILE_KEY];
                resolve(raw ? raw : null);
            });
        });
    }
    function saveProfile(profile) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [PROFILE_KEY]: profile }, () => resolve());
        });
    }
    function loadPreferences() {
        return new Promise((resolve) => {
            chrome.storage.local.get(PREFERENCES_KEY, (result) => {
                const raw = result[PREFERENCES_KEY];
                resolve(raw ? raw : null);
            });
        });
    }
    function savePreferences(prefs) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [PREFERENCES_KEY]: prefs }, () => resolve());
        });
    }
    // ---------- Build/populate input helpers ----------
    function buildProfileFromInputs() {
        const get = (el) => (el ? el.value.trim() : "");
        const firstName = get(firstNameInput);
        const middleName = get(middleNameInput);
        const lastName = get(lastNameInput);
        const fullName = get(fullNameInput) || [firstName, middleName, lastName].filter(Boolean).join(" ");
        const city = get(cityInput);
        const state = get(stateInput);
        const country = get(countryInput);
        const locationCombined = get(locationCombinedInput) || [city, state, country].filter(Boolean).join(", ");
        return {
            firstName,
            middleName,
            lastName,
            preferredName: get(preferredNameInput),
            fullName,
            email: get(emailInput),
            phoneMobile: get(phoneMobileInput),
            phoneHome: get(phoneHomeInput),
            phoneWork: get(phoneWorkInput),
            city,
            state,
            country,
            postalCode: get(postalCodeInput),
            locationCombined,
            linkedIn: get(linkedInInput),
            github: get(githubInput),
            portfolio: get(portfolioInput),
            currentCompany: get(currentCompanyInput),
            currentTitle: get(currentTitleInput),
            yearsTotal: get(yearsTotalInput),
            yearsRelevant: get(yearsRelevantInput),
            educationLevel: get(educationLevelInput),
            fieldOfStudy: get(fieldOfStudyInput),
            institutionName: get(institutionNameInput),
            graduationYear: get(graduationYearInput),
            dateOfBirth: get(dateOfBirthInput),
            raceEthnicity: get(raceEthnicityInput),
            gender: get(genderInput),
            disabilityStatus: get(disabilityStatusInput),
            veteranStatus: get(veteranStatusInput),
            sexualOrientation: get(sexualOrientationInput),
            criminalHistory: get(criminalHistoryInput),
        };
    }
    function populateProfileInputs(profile) {
        if (!profile)
            return;
        const set = (el, v) => {
            if (el)
                el.value = v || "";
        };
        set(firstNameInput, profile.firstName);
        set(middleNameInput, profile.middleName);
        set(lastNameInput, profile.lastName);
        set(preferredNameInput, profile.preferredName);
        set(fullNameInput, profile.fullName);
        set(emailInput, profile.email);
        set(phoneMobileInput, profile.phoneMobile);
        set(phoneHomeInput, profile.phoneHome);
        set(phoneWorkInput, profile.phoneWork);
        set(cityInput, profile.city);
        set(stateInput, profile.state);
        set(countryInput, profile.country);
        set(postalCodeInput, profile.postalCode);
        set(locationCombinedInput, profile.locationCombined);
        set(linkedInInput, profile.linkedIn);
        set(githubInput, profile.github);
        set(portfolioInput, profile.portfolio);
        set(currentCompanyInput, profile.currentCompany);
        set(currentTitleInput, profile.currentTitle);
        set(yearsTotalInput, profile.yearsTotal);
        set(yearsRelevantInput, profile.yearsRelevant);
        set(educationLevelInput, profile.educationLevel);
        set(fieldOfStudyInput, profile.fieldOfStudy);
        set(institutionNameInput, profile.institutionName);
        set(graduationYearInput, profile.graduationYear);
        set(dateOfBirthInput, profile.dateOfBirth);
        set(raceEthnicityInput, profile.raceEthnicity);
        set(genderInput, profile.gender);
        set(disabilityStatusInput, profile.disabilityStatus);
        set(veteranStatusInput, profile.veteranStatus);
        set(sexualOrientationInput, profile.sexualOrientation);
        set(criminalHistoryInput, profile.criminalHistory);
    }
    function buildPreferencesFromInputs() {
        const get = (el) => (el ? el.value.trim() : "");
        return {
            workAuthCountry: get(workAuthCountryInput),
            workAuthUS: get(workAuthUSInput),
            needSponsorshipFuture: get(needSponsorshipInput),
            eligibleToWorkInCountryX: get(eligibleCountryInput),
            preferredLocation: get(preferredLocationInput),
            willingToRelocate: get(relocateInput),
            onSiteOk: get(onSiteOkInput),
            hybridOk: get(hybridOkInput),
            travelPercentMax: get(travelMaxInput),
            noticePeriod: get(noticePeriodInput),
            earliestStartDate: get(earliestStartInput),
            salaryExpectations: get(salaryExpectationsInput),
            hourlyRateExpectations: get(hourlyRateInput),
        };
    }
    function populatePreferencesInputs(prefs) {
        if (!prefs)
            return;
        const set = (el, v) => {
            if (el)
                el.value = v || "";
        };
        set(workAuthCountryInput, prefs.workAuthCountry);
        set(workAuthUSInput, prefs.workAuthUS);
        set(needSponsorshipInput, prefs.needSponsorshipFuture);
        set(eligibleCountryInput, prefs.eligibleToWorkInCountryX);
        set(preferredLocationInput, prefs.preferredLocation);
        set(relocateInput, prefs.willingToRelocate);
        set(onSiteOkInput, prefs.onSiteOk);
        set(hybridOkInput, prefs.hybridOk);
        set(travelMaxInput, prefs.travelPercentMax);
        set(noticePeriodInput, prefs.noticePeriod);
        set(earliestStartInput, prefs.earliestStartDate);
        set(salaryExpectationsInput, prefs.salaryExpectations);
        set(hourlyRateInput, prefs.hourlyRateExpectations);
    }
    // ---------- Backend storage UI helpers ----------
    function setResumeStatus(msg) {
        if (!resumeStatus)
            return;
        resumeStatus.textContent = msg;
    }
    function fillProfilesSelect(profiles) {
        if (!profilesSelect)
            return;
        profilesSelect.innerHTML = "";
        for (const p of profiles) {
            const opt = document.createElement("option");
            opt.value = String(p.id);
            opt.textContent = `${p.name} (${new Date(p.created_at).toLocaleString()})`;
            profilesSelect.appendChild(opt);
        }
    }
    function fillVersionsSelect(versions) {
        if (!versionsSelect)
            return;
        versionsSelect.innerHTML = "";
        for (const v of versions) {
            const opt = document.createElement("option");
            opt.value = String(v.id);
            const resumeLabel = v.resume_id ? `resume#${v.resume_id}` : "no resume";
            opt.textContent = `${new Date(v.created_at).toLocaleString()} • ${resumeLabel}`;
            versionsSelect.appendChild(opt);
        }
    }
    // ---------- Backend API helpers ----------
    async function uploadResume(file) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`${API_BASE}/resumes`, { method: "POST", body: fd });
        if (!res.ok)
            throw new Error(await res.text());
        return res.json();
    }
    async function createProfileBackend(name) {
        const res = await fetch(`${API_BASE}/profiles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
        });
        if (!res.ok)
            throw new Error(await res.text());
        return res.json();
    }
    async function saveProfileVersion(profileId, data, resumeId) {
        const res = await fetch(`${API_BASE}/profiles/${profileId}/versions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data, resume_id: resumeId ?? null }),
        });
        if (!res.ok)
            throw new Error(await res.text());
        return res.json();
    }
    async function listProfiles() {
        const res = await fetch(`${API_BASE}/profiles`);
        if (!res.ok)
            throw new Error(await res.text());
        return res.json();
    }
    async function listProfileVersions(profileId) {
        const res = await fetch(`${API_BASE}/profiles/${profileId}/versions`);
        if (!res.ok)
            throw new Error(await res.text());
        return res.json();
    }
    async function getProfileVersion(profileId, versionId) {
        const res = await fetch(`${API_BASE}/profiles/${profileId}/versions/${versionId}`);
        if (!res.ok)
            throw new Error(await res.text());
        return res.json();
    }
    // ---------- Snapshot helpers (what gets versioned) ----------
    function getCurrentProfileSnapshot() {
        // store BOTH profile + prefs so loading brings you back to the same state
        const profile = buildProfileFromInputs();
        const preferences = buildPreferencesFromInputs();
        return {
            meta: {
                savedAt: new Date().toISOString(),
                // popup doesn't know active tab URL reliably without asking chrome.tabs; keep it simple
            },
            profile,
            preferences,
        };
    }
    async function applyLoadedProfileSnapshot(data) {
        const profile = (data?.profile ?? null);
        const preferences = (data?.preferences ?? null);
        if (profile) {
            populateProfileInputs(profile);
            await saveProfile(profile);
        }
        if (preferences) {
            populatePreferencesInputs(preferences);
            await savePreferences(preferences);
        }
        setStatus("Loaded saved version into profile/preferences.");
    }
    // ---------- Tabs wiring ----------
    function initTabs() {
        setActiveTab("profile");
        tabProfileBtn?.addEventListener("click", () => setActiveTab("profile"));
        tabPrefsBtn?.addEventListener("click", () => setActiveTab("preferences"));
    }
    // ---------- Scanning ----------
    function getActiveTab() {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tab = tabs[0];
                if (!tab || !tab.id)
                    reject(new Error("No active tab"));
                else
                    resolve(tab);
            });
        });
    }
    async function scanPageFields() {
        if (!fieldList)
            return;
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
        catch (e) {
            console.error("[Heavylift popup] scanFields exception:", e);
            fieldList.innerHTML = "<p>Error talking to page. See console for details.</p>";
        }
    }
    function renderFieldList(fields) {
        if (!fieldList)
            return;
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
    // ---------- Test fill (demo only) ----------
    async function testFill() {
        if (!currentFields.length) {
            await scanPageFields();
        }
        try {
            const tab = await getActiveTab();
            const values = currentFields
                .filter((f) => ["text", "textarea", "email", "tel", "url", "number"].includes(f.fieldType) &&
                f.htmlType !== "file")
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
            await scanPageFields();
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
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                console.error("[Heavylift popup] classify-fields HTTP error:", res.status);
                setStatus(`Classification error: HTTP ${res.status}`);
                return [];
            }
            const data = (await res.json());
            currentClassifications = data.results || [];
            console.log("[Heavylift popup] classifications:", currentClassifications);
            return currentClassifications;
        }
        catch (err) {
            console.error("[Heavylift popup] classifyCurrentFields error:", err);
            setStatus("Error contacting classifier backend.");
            return [];
        }
    }
    // ---------- Autofill from saved info (profile + preferences) ----------
    async function fillFromSavedInfo() {
        const profile = await loadProfile();
        const prefs = await loadPreferences();
        if (!profile && !prefs) {
            setStatus("No profile or preferences saved yet.");
            return;
        }
        if (!currentFields.length) {
            await scanPageFields();
        }
        if (!currentClassifications.length) {
            await classifyCurrentFields();
        }
        if (!currentClassifications.length) {
            setStatus("Could not classify fields for autofill.");
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
                                [profile?.firstName, profile?.middleName, profile?.lastName].filter(Boolean).join(" ");
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
                                [profile?.city, profile?.state, profile?.country].filter(Boolean).join(", ");
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
                    // Demographic fields
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
            const allowedTypes = ["text", "textarea", "email", "tel", "url", "number", "select", "radio"];
            if (!allowedTypes.includes(info.fieldType))
                continue;
            values.push({ fieldId: info.id, value });
        }
        if (!values.length) {
            setStatus("No fields on this page matched your saved info.");
            return;
        }
        try {
            const tab = await getActiveTab();
            const req = { type: "FILL_FIELDS", values };
            chrome.tabs.sendMessage(tab.id, req, (resp) => {
                const err = chrome.runtime.lastError;
                if (err) {
                    console.error("[Heavylift popup] sendMessage error (profile fill):", err);
                    setStatus(`Error filling from saved info: ${err.message}`);
                    return;
                }
                console.log("[Heavylift popup] fill response:", resp);
                setStatus(`Filled ${values.length} field(s) from saved info.`);
            });
        }
        catch (err) {
            console.error("[Heavylift popup] fillFromSavedInfo error:", err);
            setStatus("Error filling from saved info.");
        }
    }
    // ---------- Backend storage wiring ----------
    async function refreshProfilesAndVersions(selectProfileId) {
        // capture to locals so TS is happy + to avoid weird narrowing issues
        const pSelect = profilesSelect;
        const vSelect = versionsSelect;
        if (!pSelect || !vSelect)
            return;
        try {
            const profiles = await listProfiles();
            fillProfilesSelect(profiles);
            const firstProfile = profiles[0];
            if (!firstProfile) {
                currentProfileId = null;
                currentVersionId = null;
                vSelect.innerHTML = "";
                return;
            }
            // choose profile id: explicit arg -> selected dropdown -> fallback first
            let chosenId = selectProfileId;
            if (chosenId == null) {
                const selected = Number(pSelect.value);
                if (Number.isFinite(selected) && selected > 0) {
                    chosenId = selected;
                }
            }
            currentProfileId = chosenId ?? firstProfile.id;
            pSelect.value = String(currentProfileId);
            const versions = await listProfileVersions(currentProfileId);
            fillVersionsSelect(versions);
            const firstVersion = versions[0];
            currentVersionId = firstVersion ? firstVersion.id : null;
            if (currentVersionId != null) {
                vSelect.value = String(currentVersionId);
            }
        }
        catch (e) {
            console.error(e);
            setStatus("Could not load profiles/versions. Is backend running?");
        }
    }
    // ---------- Init ----------
    function bindDom() {
        // Existing
        scanBtn = document.getElementById("scanBtn");
        testFillBtn = document.getElementById("testFillBtn");
        fillProfileBtn = document.getElementById("fillProfileBtn");
        fieldList = document.getElementById("fieldList");
        statusEl = document.getElementById("status");
        tabProfileBtn = document.getElementById("tabProfileBtn");
        tabPrefsBtn = document.getElementById("tabPrefsBtn");
        profilePanel = document.getElementById("tab-profile");
        prefsPanel = document.getElementById("tab-preferences");
        // Profile inputs
        firstNameInput = document.getElementById("profileFirstName");
        middleNameInput = document.getElementById("profileMiddleName");
        lastNameInput = document.getElementById("profileLastName");
        preferredNameInput = document.getElementById("profilePreferredName");
        fullNameInput = document.getElementById("profileFullName");
        emailInput = document.getElementById("profileEmail");
        phoneMobileInput = document.getElementById("profilePhoneMobile");
        phoneHomeInput = document.getElementById("profilePhoneHome");
        phoneWorkInput = document.getElementById("profilePhoneWork");
        cityInput = document.getElementById("profileCity");
        stateInput = document.getElementById("profileState");
        countryInput = document.getElementById("profileCountry");
        postalCodeInput = document.getElementById("profilePostalCode");
        locationCombinedInput = document.getElementById("profileLocationCombined");
        linkedInInput = document.getElementById("profileLinkedIn");
        githubInput = document.getElementById("profileGithub");
        portfolioInput = document.getElementById("profilePortfolio");
        currentCompanyInput = document.getElementById("profileCurrentCompany");
        currentTitleInput = document.getElementById("profileCurrentTitle");
        yearsTotalInput = document.getElementById("profileYearsTotal");
        yearsRelevantInput = document.getElementById("profileYearsRelevant");
        educationLevelInput = document.getElementById("profileEducationLevel");
        fieldOfStudyInput = document.getElementById("profileFieldOfStudy");
        institutionNameInput = document.getElementById("profileInstitutionName");
        graduationYearInput = document.getElementById("profileGraduationYear");
        dateOfBirthInput = document.getElementById("profileDateOfBirth");
        raceEthnicityInput = document.getElementById("profileRaceEthnicity");
        genderInput = document.getElementById("profileGender");
        disabilityStatusInput = document.getElementById("profileDisabilityStatus");
        veteranStatusInput = document.getElementById("profileVeteranStatus");
        sexualOrientationInput = document.getElementById("profileSexualOrientation");
        criminalHistoryInput = document.getElementById("profileCriminalHistory");
        // Pref inputs
        workAuthCountryInput = document.getElementById("prefWorkAuthCountry");
        workAuthUSInput = document.getElementById("prefWorkAuthUS");
        needSponsorshipInput = document.getElementById("prefNeedSponsorship");
        eligibleCountryInput = document.getElementById("prefEligibleCountry");
        preferredLocationInput = document.getElementById("prefPreferredLocation");
        relocateInput = document.getElementById("prefRelocate");
        onSiteOkInput = document.getElementById("prefOnSiteOk");
        hybridOkInput = document.getElementById("prefHybridOk");
        travelMaxInput = document.getElementById("prefTravelMax");
        noticePeriodInput = document.getElementById("prefNoticePeriod");
        earliestStartInput = document.getElementById("prefEarliestStart");
        salaryExpectationsInput = document.getElementById("prefSalaryExpectations");
        hourlyRateInput = document.getElementById("prefHourlyRate");
        // Local save buttons
        saveProfileBtn = document.getElementById("saveProfileBtn");
        savePreferencesBtn = document.getElementById("savePreferencesBtn");
        // Backend storage UI (these IDs must exist in popup.html for these features to show)
        profileNameInputEl = document.getElementById("profileNameInput");
        createProfileBtnEl = document.getElementById("createProfileBtn");
        profilesSelect = document.getElementById("profilesSelect");
        versionsSelect = document.getElementById("versionsSelect");
        saveVersionBtnEl = document.getElementById("saveVersionBtn");
        loadVersionBtnEl = document.getElementById("loadVersionBtn");
        resumeFileInput = document.getElementById("resumeFileInput");
        uploadResumeBtnEl = document.getElementById("uploadResumeBtn");
        resumeStatus = document.getElementById("resumeStatus");
    }
    function wireEvents() {
        scanBtn?.addEventListener("click", () => scanPageFields());
        testFillBtn?.addEventListener("click", () => testFill());
        fillProfileBtn?.addEventListener("click", () => fillFromSavedInfo());
        saveProfileBtn?.addEventListener("click", async () => {
            const profile = buildProfileFromInputs();
            await saveProfile(profile);
            setStatus("Profile saved.");
        });
        savePreferencesBtn?.addEventListener("click", async () => {
            const prefs = buildPreferencesFromInputs();
            await savePreferences(prefs);
            setStatus("Preferences saved.");
        });
        // Backend storage UI wiring (no-op if popup.html doesn't have these elements)
        createProfileBtnEl?.addEventListener("click", async () => {
            const name = (profileNameInputEl?.value || "").trim();
            if (!name) {
                setStatus("Enter a profile name first.");
                return;
            }
            try {
                const created = await createProfileBackend(name);
                setStatus(`Created profile: ${created.name}`);
                await refreshProfilesAndVersions(created.id);
            }
            catch (e) {
                console.error(e);
                setStatus("Could not create profile (is backend running?)");
            }
        });
        profilesSelect?.addEventListener("change", async () => {
            if (!profilesSelect)
                return;
            const pid = Number(profilesSelect.value);
            if (!pid)
                return;
            await refreshProfilesAndVersions(pid);
        });
        uploadResumeBtnEl?.addEventListener("click", async () => {
            const file = resumeFileInput?.files?.[0];
            if (!file) {
                setResumeStatus("Select a resume file first.");
                return;
            }
            setResumeStatus("Uploading...");
            try {
                const uploaded = await uploadResume(file);
                currentResumeId = uploaded.id;
                setResumeStatus(`Uploaded: ${uploaded.filename} (id=${uploaded.id})`);
            }
            catch (e) {
                console.error(e);
                setResumeStatus("Upload failed. Check console.");
            }
        });
        saveVersionBtnEl?.addEventListener("click", async () => {
            if (!currentProfileId) {
                setStatus("Select or create a backend profile first.");
                return;
            }
            try {
                const snapshot = getCurrentProfileSnapshot();
                const saved = await saveProfileVersion(currentProfileId, snapshot, currentResumeId ?? undefined);
                setStatus(`Saved version ${saved.id}`);
                await refreshProfilesAndVersions(currentProfileId);
                if (versionsSelect) {
                    versionsSelect.value = String(saved.id);
                }
                currentVersionId = saved.id;
            }
            catch (e) {
                console.error(e);
                setStatus("Could not save version (is backend running?)");
            }
        });
        loadVersionBtnEl?.addEventListener("click", async () => {
            if (!currentProfileId || !versionsSelect) {
                setStatus("Select a profile + version first.");
                return;
            }
            const vid = Number(versionsSelect.value);
            if (!vid) {
                setStatus("Select a version first.");
                return;
            }
            try {
                const v = await getProfileVersion(currentProfileId, vid);
                await applyLoadedProfileSnapshot(v.data);
                currentVersionId = vid;
            }
            catch (e) {
                console.error(e);
                setStatus("Could not load version (is backend running?)");
            }
        });
    }
    async function init() {
        bindDom();
        initTabs();
        wireEvents();
        // Load local saved profile/prefs into inputs
        const p = await loadProfile();
        populateProfileInputs(p);
        const prefs = await loadPreferences();
        populatePreferencesInputs(prefs);
        // Scan fields on open
        await scanPageFields();
        // If backend storage UI exists, pre-load profiles/versions
        if (profilesSelect && versionsSelect) {
            await refreshProfilesAndVersions();
        }
    }
    document.addEventListener("DOMContentLoaded", () => {
        init().catch((e) => console.error("[Heavylift popup] init error:", e));
    });
})();
//# sourceMappingURL=popup.js.map