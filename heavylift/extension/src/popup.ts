// src/popup.ts

(() => {
  // ---------- Types ----------
  type PopupFieldType =
    | "text"
    | "textarea"
    | "checkbox"
    | "radio"
    | "select"
    | "email"
    | "tel"
    | "url"
    | "number"
    | "date"
    | "unknown";

  interface PopupFieldInfo {
    id: string;
    domSelector: string;
    label: string;
    placeholder?: string;
    name?: string | null;
    htmlType?: string | null;
    tagName: string;
    fieldType: PopupFieldType;
    options?: string[];
  }

  interface PopupScanFieldsRequest {
    type: "SCAN_FIELDS";
  }

  interface PopupScanFieldsResponse {
    type: "SCAN_FIELDS_RESULT";
    fields: PopupFieldInfo[];
  }

  interface PopupFillFieldValue {
    fieldId: string;
    value: string | string[] | boolean;
  }

  interface PopupFillFieldsRequest {
    type: "FILL_FIELDS";
    values: PopupFillFieldValue[];
  }

  interface Profile {
    firstName: string;
    middleName: string;
    lastName: string;
    preferredName: string;
    fullName: string;
    email: string;
    phoneMobile: string;
    phoneHome: string;
    phoneWork: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    locationCombined: string;
    linkedIn: string;
    github: string;
    portfolio: string;
    currentCompany: string;
    currentTitle: string;
    yearsTotal: string;
    yearsRelevant: string;
    educationLevel: string;
    fieldOfStudy: string;
    institutionName: string;
    graduationYear: string;

    dateOfBirth: string;
    raceEthnicity: string;
    gender: string;
    disabilityStatus: string;
    veteranStatus: string;
    sexualOrientation: string;
    criminalHistory: string;
  }

  interface Preferences {
    workAuthCountry: string;
    workAuthUS: string;
    needSponsorshipFuture: string;
    eligibleToWorkInCountryX: string;
    preferredLocation: string;
    willingToRelocate: string;
    onSiteOk: string;
    hybridOk: string;
    travelPercentMax: string;
    noticePeriod: string;
    earliestStartDate: string;
    salaryExpectations: string;
    hourlyRateExpectations: string;
  }

  interface ClassifiedField {
    field_id: string;
    canonical_key: string;
    source: string;
    confidence: number;
    sensitive: boolean;
    autofill_allowed: boolean;
  }

  interface ClassifyFieldsResponse {
    results: ClassifiedField[];
  }

  interface GenerateAnswersRequest {
  job_info?: { url?: string | null } | null;
  profile?: any | null;
  preferences?: any | null;
  resume_id?: number | null;
  fields: {
    id: string;
    label?: string;
    name?: string;
    placeholder?: string;
    tag?: string;
    html_type?: string;
    options?: string[] | null;
  }[];
}

interface GenerateAnswer {
  field_id: string;
  value: string | null;
  autofill: boolean;
  confidence: number;
  source_type: string;
  source_ref?: string | null;
}

interface GenerateAnswersResponse {
  suggestions: GenerateAnswer[];
}


  // ---------- Constants ----------
  const PROFILE_KEY = "heavylift_profile";
  const PREFERENCES_KEY = "heavylift_preferences";
  const API_BASE = "http://127.0.0.1:8000";
  const BACKEND_URL = API_BASE;

  // ---------- UI elements (nullable; set on init) ----------
  // Existing buttons/areas
  let scanBtn: HTMLButtonElement | null = null;
  let testFillBtn: HTMLButtonElement | null = null;
  let fillProfileBtn: HTMLButtonElement | null = null;
  let fieldList: HTMLDivElement | null = null;
  let statusEl: HTMLDivElement | null = null;

  // Tabs
  let tabProfileBtn: HTMLButtonElement | null = null;
  let tabPrefsBtn: HTMLButtonElement | null = null;
  let profilePanel: HTMLDivElement | null = null;
  let prefsPanel: HTMLDivElement | null = null;

  // Profile inputs
  let firstNameInput: HTMLInputElement | null = null;
  let middleNameInput: HTMLInputElement | null = null;
  let lastNameInput: HTMLInputElement | null = null;
  let preferredNameInput: HTMLInputElement | null = null;
  let fullNameInput: HTMLInputElement | null = null;

  let emailInput: HTMLInputElement | null = null;
  let phoneMobileInput: HTMLInputElement | null = null;
  let phoneHomeInput: HTMLInputElement | null = null;
  let phoneWorkInput: HTMLInputElement | null = null;

  let cityInput: HTMLInputElement | null = null;
  let stateInput: HTMLInputElement | null = null;
  let countryInput: HTMLInputElement | null = null;
  let postalCodeInput: HTMLInputElement | null = null;
  let locationCombinedInput: HTMLInputElement | null = null;

  let linkedInInput: HTMLInputElement | null = null;
  let githubInput: HTMLInputElement | null = null;
  let portfolioInput: HTMLInputElement | null = null;

  let currentCompanyInput: HTMLInputElement | null = null;
  let currentTitleInput: HTMLInputElement | null = null;
  let yearsTotalInput: HTMLInputElement | null = null;
  let yearsRelevantInput: HTMLInputElement | null = null;

  let educationLevelInput: HTMLInputElement | null = null;
  let fieldOfStudyInput: HTMLInputElement | null = null;
  let institutionNameInput: HTMLInputElement | null = null;
  let graduationYearInput: HTMLInputElement | null = null;

  // Demographic-ish profile fields
  let dateOfBirthInput: HTMLInputElement | null = null;
  let raceEthnicityInput: HTMLInputElement | null = null;
  let genderInput: HTMLInputElement | null = null;
  let disabilityStatusInput: HTMLInputElement | null = null;
  let veteranStatusInput: HTMLInputElement | null = null;
  let sexualOrientationInput: HTMLInputElement | null = null;
  let criminalHistoryInput: HTMLInputElement | null = null;

  // Preferences inputs
  let workAuthCountryInput: HTMLInputElement | null = null;
  let workAuthUSInput: HTMLInputElement | null = null;
  let needSponsorshipInput: HTMLInputElement | null = null;
  let eligibleCountryInput: HTMLInputElement | null = null;
  let preferredLocationInput: HTMLInputElement | null = null;
  let relocateInput: HTMLInputElement | null = null;
  let onSiteOkInput: HTMLInputElement | null = null;
  let hybridOkInput: HTMLInputElement | null = null;
  let travelMaxInput: HTMLInputElement | null = null;
  let noticePeriodInput: HTMLInputElement | null = null;
  let earliestStartInput: HTMLInputElement | null = null;
  let salaryExpectationsInput: HTMLInputElement | null = null;
  let hourlyRateInput: HTMLInputElement | null = null;

  // Local save buttons
  let saveProfileBtn: HTMLButtonElement | null = null;
  let savePreferencesBtn: HTMLButtonElement | null = null;

  // New backend storage UI
  let profileNameInputEl: HTMLInputElement | null = null;
  let createProfileBtnEl: HTMLButtonElement | null = null;
  let profilesSelect: HTMLSelectElement | null = null;
  let versionsSelect: HTMLSelectElement | null = null;
  let saveVersionBtnEl: HTMLButtonElement | null = null;
  let loadVersionBtnEl: HTMLButtonElement | null = null;

  let resumeFileInput: HTMLInputElement | null = null;
  let uploadResumeBtnEl: HTMLButtonElement | null = null;
  let resumeStatus: HTMLElement | null = null;

  // ---------- State ----------
  let currentFields: PopupFieldInfo[] = [];
  let currentClassifications: ClassifiedField[] = [];

  // Backend storage state
  let currentResumeId: number | null = null;
  let currentProfileId: number | null = null;
  let currentVersionId: number | null = null;

  // ---------- Small helpers ----------
  function setStatus(msg: string) {
    if (statusEl) statusEl.textContent = msg;
  }

  function setActiveTab(tab: "profile" | "preferences") {
    if (!tabProfileBtn || !tabPrefsBtn || !profilePanel || !prefsPanel) return;

    const profileActive = tab === "profile";
    tabProfileBtn.classList.toggle("active", profileActive);
    tabPrefsBtn.classList.toggle("active", !profileActive);
    profilePanel.classList.toggle("active", profileActive);
    prefsPanel.classList.toggle("active", !profileActive);
  }

  // ---------- Storage helpers (chrome.storage.local) ----------
  function loadProfile(): Promise<Profile | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get(PROFILE_KEY, (result) => {
        const raw = result[PROFILE_KEY];
        resolve(raw ? (raw as Profile) : null);
      });
    });
  }

  function saveProfile(profile: Profile): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [PROFILE_KEY]: profile }, () => resolve());
    });
  }

  function loadPreferences(): Promise<Preferences | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get(PREFERENCES_KEY, (result) => {
        const raw = result[PREFERENCES_KEY];
        resolve(raw ? (raw as Preferences) : null);
      });
    });
  }

  function savePreferences(prefs: Preferences): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [PREFERENCES_KEY]: prefs }, () => resolve());
    });
  }

  // ---------- Build/populate input helpers ----------
  function buildProfileFromInputs(): Profile {
    const get = (el: HTMLInputElement | null) => (el ? el.value.trim() : "");

    const firstName = get(firstNameInput);
    const middleName = get(middleNameInput);
    const lastName = get(lastNameInput);

    const fullName =
      get(fullNameInput) || [firstName, middleName, lastName].filter(Boolean).join(" ");

    const city = get(cityInput);
    const state = get(stateInput);
    const country = get(countryInput);

    const locationCombined =
      get(locationCombinedInput) || [city, state, country].filter(Boolean).join(", ");

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

  function populateProfileInputs(profile: Profile | null) {
    if (!profile) return;

    const set = (el: HTMLInputElement | null, v: string) => {
      if (el) el.value = v || "";
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

  function buildPreferencesFromInputs(): Preferences {
    const get = (el: HTMLInputElement | null) => (el ? el.value.trim() : "");
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

  function populatePreferencesInputs(prefs: Preferences | null) {
    if (!prefs) return;

    const set = (el: HTMLInputElement | null, v: string) => {
      if (el) el.value = v || "";
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
  function setResumeStatus(msg: string) {
    if (!resumeStatus) return;
    resumeStatus.textContent = msg;
  }

  function fillProfilesSelect(profiles: Array<{ id: number; name: string; created_at: string }>) {
    if (!profilesSelect) return;

    profilesSelect.innerHTML = "";
    for (const p of profiles) {
      const opt = document.createElement("option");
      opt.value = String(p.id);
      opt.textContent = `${p.name} (${new Date(p.created_at).toLocaleString()})`;
      profilesSelect.appendChild(opt);
    }
  }

  function fillVersionsSelect(
    versions: Array<{ id: number; resume_id: number | null; created_at: string }>
  ) {
    if (!versionsSelect) return;

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
  async function uploadResume(file: File): Promise<{ id: number; filename: string; sha256: string; created_at: string }> {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch(`${API_BASE}/resumes`, { method: "POST", body: fd });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function createProfileBackend(name: string): Promise<{ id: number; name: string; created_at: string }> {
    const res = await fetch(`${API_BASE}/profiles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function saveProfileVersion(
    profileId: number,
    data: Record<string, any>,
    resumeId?: number
  ): Promise<{ id: number; profile_id: number; resume_id: number | null; created_at: string }> {
    const res = await fetch(`${API_BASE}/profiles/${profileId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, resume_id: resumeId ?? null }),
    });

    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function listProfiles(): Promise<Array<{ id: number; name: string; created_at: string }>> {
    const res = await fetch(`${API_BASE}/profiles`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function listProfileVersions(
    profileId: number
  ): Promise<Array<{ id: number; resume_id: number | null; created_at: string }>> {
    const res = await fetch(`${API_BASE}/profiles/${profileId}/versions`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function getProfileVersion(
    profileId: number,
    versionId: number
  ): Promise<{ id: number; created_at: string; data: Record<string, any> }> {
    const res = await fetch(`${API_BASE}/profiles/${profileId}/versions/${versionId}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function generateAnswers(payload: GenerateAnswersRequest): Promise<GenerateAnswersResponse> {
    const res = await fetch(`${API_BASE}/generate-answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function getLatestResumeId(): Promise<number | null> {
    const res = await fetch(`${API_BASE}/resumes/latest`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.resume_id ? Number(data.resume_id) : null;
  }


  // ---------- Snapshot helpers (what gets versioned) ----------
  function getCurrentProfileSnapshot(): Record<string, any> {
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

  async function applyLoadedProfileSnapshot(data: Record<string, any>) {
    const profile = (data?.profile ?? null) as Profile | null;
    const preferences = (data?.preferences ?? null) as Preferences | null;

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
  function getActiveTab(): Promise<chrome.tabs.Tab> {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab || !tab.id) reject(new Error("No active tab"));
        else resolve(tab);
      });
    });
  }

  async function scanPageFields(): Promise<void> {
    if (!fieldList) return;

    try {
      const tab = await getActiveTab();
      const req: PopupScanFieldsRequest = { type: "SCAN_FIELDS" };

      chrome.tabs.sendMessage(tab.id!, req, (response?: PopupScanFieldsResponse | any) => {
        const err = chrome.runtime.lastError;
        if (err) {
          console.error("[Heavylift popup] sendMessage error:", err);
          fieldList!.innerHTML = `<p>Error talking to page: ${err.message}</p>`;
          return;
        }

        if (!response || !response.fields) {
          fieldList!.innerHTML = "<p>Could not read fields on this page.</p>";
          return;
        }

        currentFields = response.fields;
        currentClassifications = []; // reset when fields change
        renderFieldList(currentFields);
      });
    } catch (e) {
      console.error("[Heavylift popup] scanFields exception:", e);
      fieldList.innerHTML = "<p>Error talking to page. See console for details.</p>";
    }
  }

  function renderFieldList(fields: PopupFieldInfo[]) {
    if (!fieldList) return;

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

      const values: PopupFillFieldsRequest["values"] = currentFields
        .filter(
          (f) =>
            ["text", "textarea", "email", "tel", "url", "number"].includes(f.fieldType) &&
            f.htmlType !== "file"
        )
        .map((f) => ({
          fieldId: f.id,
          value: "demo",
        }));

      const req: PopupFillFieldsRequest = {
        type: "FILL_FIELDS",
        values,
      };

      chrome.tabs.sendMessage(tab.id!, req, (resp) => {
        const err = chrome.runtime.lastError;
        if (err) {
          console.error("[Heavylift popup] sendMessage error (fill):", err);
          return;
        }
        console.log("[Heavylift popup] fill response:", resp);
      });
    } catch (err) {
      console.error("[Heavylift popup] testFill error:", err);
    }
  }

  // ---------- ML classification ----------
  async function classifyCurrentFields(): Promise<ClassifiedField[]> {
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

      const data = (await res.json()) as ClassifyFieldsResponse;
      currentClassifications = data.results || [];
      console.log("[Heavylift popup] classifications:", currentClassifications);
      return currentClassifications;
    } catch (err) {
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

    // Ensure we have fields scanned
    
    await scanPageFields();
    await classifyCurrentFields();
  

    if (!currentFields.length) {
      setStatus("No fillable fields found on this page.");
      return;
    }

    // Build backend fields from currentFields
    const backendFields = currentFields.map((f) => ({
      id: f.id,
      label: f.label || "",
      name: f.name || "",
      placeholder: f.placeholder || "",
      tag: (f.tagName || "").toLowerCase(),
      html_type: f.htmlType || "",
      options: f.options || null,
    }));

    setStatus("Generating answers (backend + RAG + Gemini)…");

    try {
      const tab = await getActiveTab();
      const url = tab.url || null;
      console.log("[Heavylift] resume_id being sent:", currentResumeId);
      if (!currentResumeId) {
        const latest = await getLatestResumeId();
        if (latest) currentResumeId = latest;
      }

      // Call backend /generate-answers
      const resp = await generateAnswers({
        job_info: { url },
        profile: profile || null,
        preferences: prefs || null,
        resume_id: currentResumeId || null, // make sure currentResumeId exists in your popup.ts state
        fields: backendFields,
      });

      const values: PopupFillFieldsRequest["values"] = resp.suggestions
        .filter((s) => s.autofill && s.value)
        .map((s) => ({ fieldId: s.field_id, value: s.value! }));

      if (!values.length) {
        setStatus("No high-confidence fields to autofill (safe mode).");
        return;
      }

      // Send fill instructions to content script
      const req: PopupFillFieldsRequest = { type: "FILL_FIELDS", values };

      chrome.tabs.sendMessage(tab.id!, req, (resp2) => {
        const err = chrome.runtime.lastError;
        if (err) {
          console.error("[Heavylift popup] sendMessage error (profile fill):", err);
          setStatus(`Error filling from saved info: ${err.message}`);
          return;
        }
        console.log("[Heavylift popup] fill response:", resp2);
        setStatus(`Filled ${values.length} field(s) from saved info.`);
      });
    } catch (err) {
      console.error("[Heavylift popup] fillFromSavedInfo error:", err);
      setStatus("Error filling from saved info.");
    }
  }


  // ---------- Backend storage wiring ----------
async function refreshProfilesAndVersions(selectProfileId?: number) {
  // capture to locals so TS is happy + to avoid weird narrowing issues
  const pSelect = profilesSelect;
  const vSelect = versionsSelect;

  if (!pSelect || !vSelect) return;

  try {
    const profiles: Array<{ id: number; name: string; created_at: string }> = await listProfiles();
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

    const versions: Array<{ id: number; resume_id: number | null; created_at: string }> =
      await listProfileVersions(currentProfileId);

    fillVersionsSelect(versions);

    const firstVersion = versions[0];
    currentVersionId = firstVersion ? firstVersion.id : null;

    if (currentVersionId != null) {
      vSelect.value = String(currentVersionId);
    }
  } catch (e: any) {
    console.error(e);
    setStatus("Could not load profiles/versions. Is backend running?");
  }
}


  // ---------- Init ----------
  function bindDom() {
    // Existing
    scanBtn = document.getElementById("scanBtn") as HTMLButtonElement | null;
    testFillBtn = document.getElementById("testFillBtn") as HTMLButtonElement | null;
    fillProfileBtn = document.getElementById("fillProfileBtn") as HTMLButtonElement | null;
    fieldList = document.getElementById("fieldList") as HTMLDivElement | null;
    statusEl = document.getElementById("status") as HTMLDivElement | null;

    tabProfileBtn = document.getElementById("tabProfileBtn") as HTMLButtonElement | null;
    tabPrefsBtn = document.getElementById("tabPrefsBtn") as HTMLButtonElement | null;
    profilePanel = document.getElementById("tab-profile") as HTMLDivElement | null;
    prefsPanel = document.getElementById("tab-preferences") as HTMLDivElement | null;

    // Profile inputs
    firstNameInput = document.getElementById("profileFirstName") as HTMLInputElement | null;
    middleNameInput = document.getElementById("profileMiddleName") as HTMLInputElement | null;
    lastNameInput = document.getElementById("profileLastName") as HTMLInputElement | null;
    preferredNameInput = document.getElementById("profilePreferredName") as HTMLInputElement | null;
    fullNameInput = document.getElementById("profileFullName") as HTMLInputElement | null;

    emailInput = document.getElementById("profileEmail") as HTMLInputElement | null;
    phoneMobileInput = document.getElementById("profilePhoneMobile") as HTMLInputElement | null;
    phoneHomeInput = document.getElementById("profilePhoneHome") as HTMLInputElement | null;
    phoneWorkInput = document.getElementById("profilePhoneWork") as HTMLInputElement | null;

    cityInput = document.getElementById("profileCity") as HTMLInputElement | null;
    stateInput = document.getElementById("profileState") as HTMLInputElement | null;
    countryInput = document.getElementById("profileCountry") as HTMLInputElement | null;
    postalCodeInput = document.getElementById("profilePostalCode") as HTMLInputElement | null;
    locationCombinedInput = document.getElementById("profileLocationCombined") as HTMLInputElement | null;

    linkedInInput = document.getElementById("profileLinkedIn") as HTMLInputElement | null;
    githubInput = document.getElementById("profileGithub") as HTMLInputElement | null;
    portfolioInput = document.getElementById("profilePortfolio") as HTMLInputElement | null;

    currentCompanyInput = document.getElementById("profileCurrentCompany") as HTMLInputElement | null;
    currentTitleInput = document.getElementById("profileCurrentTitle") as HTMLInputElement | null;
    yearsTotalInput = document.getElementById("profileYearsTotal") as HTMLInputElement | null;
    yearsRelevantInput = document.getElementById("profileYearsRelevant") as HTMLInputElement | null;

    educationLevelInput = document.getElementById("profileEducationLevel") as HTMLInputElement | null;
    fieldOfStudyInput = document.getElementById("profileFieldOfStudy") as HTMLInputElement | null;
    institutionNameInput = document.getElementById("profileInstitutionName") as HTMLInputElement | null;
    graduationYearInput = document.getElementById("profileGraduationYear") as HTMLInputElement | null;

    dateOfBirthInput = document.getElementById("profileDateOfBirth") as HTMLInputElement | null;
    raceEthnicityInput = document.getElementById("profileRaceEthnicity") as HTMLInputElement | null;
    genderInput = document.getElementById("profileGender") as HTMLInputElement | null;
    disabilityStatusInput = document.getElementById("profileDisabilityStatus") as HTMLInputElement | null;
    veteranStatusInput = document.getElementById("profileVeteranStatus") as HTMLInputElement | null;
    sexualOrientationInput = document.getElementById("profileSexualOrientation") as HTMLInputElement | null;
    criminalHistoryInput = document.getElementById("profileCriminalHistory") as HTMLInputElement | null;

    // Pref inputs
    workAuthCountryInput = document.getElementById("prefWorkAuthCountry") as HTMLInputElement | null;
    workAuthUSInput = document.getElementById("prefWorkAuthUS") as HTMLInputElement | null;
    needSponsorshipInput = document.getElementById("prefNeedSponsorship") as HTMLInputElement | null;
    eligibleCountryInput = document.getElementById("prefEligibleCountry") as HTMLInputElement | null;
    preferredLocationInput = document.getElementById("prefPreferredLocation") as HTMLInputElement | null;
    relocateInput = document.getElementById("prefRelocate") as HTMLInputElement | null;
    onSiteOkInput = document.getElementById("prefOnSiteOk") as HTMLInputElement | null;
    hybridOkInput = document.getElementById("prefHybridOk") as HTMLInputElement | null;
    travelMaxInput = document.getElementById("prefTravelMax") as HTMLInputElement | null;
    noticePeriodInput = document.getElementById("prefNoticePeriod") as HTMLInputElement | null;
    earliestStartInput = document.getElementById("prefEarliestStart") as HTMLInputElement | null;
    salaryExpectationsInput = document.getElementById("prefSalaryExpectations") as HTMLInputElement | null;
    hourlyRateInput = document.getElementById("prefHourlyRate") as HTMLInputElement | null;

    // Local save buttons
    saveProfileBtn = document.getElementById("saveProfileBtn") as HTMLButtonElement | null;
    savePreferencesBtn = document.getElementById("savePreferencesBtn") as HTMLButtonElement | null;

    // Backend storage UI (these IDs must exist in popup.html for these features to show)
    profileNameInputEl = document.getElementById("profileNameInput") as HTMLInputElement | null;
    createProfileBtnEl = document.getElementById("createProfileBtn") as HTMLButtonElement | null;
    profilesSelect = document.getElementById("profilesSelect") as HTMLSelectElement | null;
    versionsSelect = document.getElementById("versionsSelect") as HTMLSelectElement | null;
    saveVersionBtnEl = document.getElementById("saveVersionBtn") as HTMLButtonElement | null;
    loadVersionBtnEl = document.getElementById("loadVersionBtn") as HTMLButtonElement | null;

    resumeFileInput = document.getElementById("resumeFileInput") as HTMLInputElement | null;
    uploadResumeBtnEl = document.getElementById("uploadResumeBtn") as HTMLButtonElement | null;
    resumeStatus = document.getElementById("resumeStatus") as HTMLElement | null;
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
      } catch (e: any) {
        console.error(e);
        setStatus("Could not create profile (is backend running?)");
      }
    });

    profilesSelect?.addEventListener("change", async () => {
      if (!profilesSelect) return;
      const pid = Number(profilesSelect.value);
      if (!pid) return;
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
        await chrome.storage.local.set({ currentResumeId: uploaded.id });
        setResumeStatus(`Uploaded: ${uploaded.filename} (id=${uploaded.id})`);
      } catch (e: any) {
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
      } catch (e: any) {
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
      } catch (e: any) {
        console.error(e);
        setStatus("Could not load version (is backend running?)");
      }
    });
  }

(async () => {
  const stored = await chrome.storage.local.get(["currentResumeId"]);
  const rid = Number(stored?.currentResumeId);

  if (Number.isFinite(rid) && rid > 0) {
    currentResumeId = rid;
    setResumeStatus(`Using saved resume (id=${rid})`);
  }
})();


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
