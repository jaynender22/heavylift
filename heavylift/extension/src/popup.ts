// src/popup.ts

// Local types (popup-only, prefixed)

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
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedIn: string;
  github: string;
  portfolio: string;
}

// ML classification types

interface ClassifiedField {
  field_id: string;
  canonical_key: string;
  source: string; // e.g. "profile.email"
  confidence: number;
  sensitive: boolean;
  autofill_allowed: boolean;
}

interface ClassifyFieldsResponse {
  results: ClassifiedField[];
}

const PROFILE_KEY = "heavylift_profile";
const BACKEND_URL = "http://127.0.0.1:8000";

// ---------- UI elements ----------

const scanBtn = document.getElementById("scanBtn") as HTMLButtonElement;
const testFillBtn = document.getElementById("testFillBtn") as HTMLButtonElement;
const fieldList = document.getElementById("fieldList") as HTMLDivElement;

const fullNameInput = document.getElementById(
  "profileFullName"
) as HTMLInputElement;
const emailInput = document.getElementById("profileEmail") as HTMLInputElement;
const phoneInput = document.getElementById("profilePhone") as HTMLInputElement;
const locationInput = document.getElementById(
  "profileLocation"
) as HTMLInputElement;
const linkedInInput = document.getElementById(
  "profileLinkedIn"
) as HTMLInputElement;
const githubInput = document.getElementById(
  "profileGithub"
) as HTMLInputElement;
const portfolioInput = document.getElementById(
  "profilePortfolio"
) as HTMLInputElement;

const saveProfileBtn = document.getElementById(
  "saveProfileBtn"
) as HTMLButtonElement;
const fillProfileBtn = document.getElementById(
  "fillProfileBtn"
) as HTMLButtonElement;

const statusEl = document.getElementById("status") as HTMLDivElement;

let currentFields: PopupFieldInfo[] = [];
let currentClassifications: ClassifiedField[] = [];

// ---------- storage helpers ----------

function loadProfile(): Promise<Profile | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(PROFILE_KEY, (result) => {
      const raw = result[PROFILE_KEY];
      if (!raw) {
        resolve(null);
        return;
      }
      resolve(raw as Profile);
    });
  });
}

function saveProfile(profile: Profile): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [PROFILE_KEY]: profile }, () => {
      resolve();
    });
  });
}

function populateProfileInputs(profile: Profile | null) {
  if (!profile) return;
  fullNameInput.value = profile.fullName || "";
  emailInput.value = profile.email || "";
  phoneInput.value = profile.phone || "";
  locationInput.value = profile.location || "";
  linkedInInput.value = profile.linkedIn || "";
  githubInput.value = profile.github || "";
  portfolioInput.value = profile.portfolio || "";
}

// ---------- tab helpers ----------

function getActiveTab(): Promise<chrome.tabs.Tab> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.id) {
        reject(new Error("No active tab"));
      } else {
        resolve(tab);
      }
    });
  });
}

// ---------- scanning ----------

async function scanFields() {
  try {
    const tab = await getActiveTab();
    const req: PopupScanFieldsRequest = { type: "SCAN_FIELDS" };

    chrome.tabs.sendMessage(
      tab.id!,
      req,
      (response?: PopupScanFieldsResponse) => {
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
      }
    );
  } catch (err) {
    console.error("[Heavylift popup] scanFields error:", err);
    fieldList.innerHTML = "<p>Error scanning fields.</p>";
  }
}

function renderFieldList(fields: PopupFieldInfo[]) {
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

// ---------- test fill (demo) ----------

async function testFill() {
  if (!currentFields.length) {
    await scanFields();
  }

  try {
    const tab = await getActiveTab();

    const values: PopupFillFieldsRequest["values"] = currentFields
      .filter(
        (f) =>
          ["text", "textarea", "email", "tel", "url", "number"].includes(
            f.fieldType
          ) && f.htmlType !== "file"
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

// ---------- profile helpers ----------

function buildProfileFromInputs(): Profile {
  return {
    fullName: fullNameInput.value.trim(),
    email: emailInput.value.trim(),
    phone: phoneInput.value.trim(),
    location: locationInput.value.trim(),
    linkedIn: linkedInInput.value.trim(),
    github: githubInput.value.trim(),
    portfolio: portfolioInput.value.trim(),
  };
}

// ---------- ML classification ----------

async function classifyCurrentFields(): Promise<ClassifiedField[]> {
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
      console.error(
        "[Heavylift popup] classify-fields HTTP error:",
        res.status
      );
      statusEl.textContent = `Classification error: HTTP ${res.status}`;
      return [];
    }

    const data = (await res.json()) as ClassifyFieldsResponse;
    currentClassifications = data.results || [];
    console.log("[Heavylift popup] classifications:", currentClassifications);
    return currentClassifications;
  } catch (err) {
    console.error("[Heavylift popup] classifyCurrentFields error:", err);
    statusEl.textContent = "Error contacting classifier backend.";
    return [];
  }
}

// ---------- profile-driven autofill (ML-assisted) ----------

async function fillFromProfile() {
  const profile = await loadProfile();
  if (!profile) {
    statusEl.textContent = "No profile saved yet.";
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

  const values: PopupFillFieldsRequest["values"] = [];

  for (const info of currentFields) {
    const cls = currentClassifications.find(
      (c) => c.field_id === info.id && c.autofill_allowed
    );
    if (!cls) continue;

    let value: string | null = null;

    switch (cls.source) {
      case "profile.fullName":
        value = profile.fullName;
        break;
      case "profile.email":
        value = profile.email;
        break;
      case "profile.phone":
        value = profile.phone;
        break;
      case "profile.location":
        value = profile.location;
        break;
      case "profile.linkedIn":
        value = profile.linkedIn;
        break;
      case "profile.github":
        value = profile.github;
        break;
      case "profile.portfolio":
        value = profile.portfolio;
        break;
      default:
        value = null;
    }

    if (
      !value ||
      !["text", "textarea", "email", "tel", "url"].includes(info.fieldType) ||
      info.htmlType === "file"
    ) {
      continue;
    }

    values.push({
      fieldId: info.id,
      value,
    });
  }

  if (!values.length) {
    statusEl.textContent = "No fields on this page matched your profile.";
    return;
  }

  try {
    const tab = await getActiveTab();
    const req: PopupFillFieldsRequest = {
      type: "FILL_FIELDS",
      values,
    };

    chrome.tabs.sendMessage(tab.id!, req, (resp) => {
      const err = chrome.runtime.lastError;
      if (err) {
        console.error(
          "[Heavylift popup] sendMessage error (profile fill):",
          err
        );
        statusEl.textContent = `Error filling from profile: ${err.message}`;
        return;
      }
      console.log("[Heavylift popup] profile fill response:", resp);
      statusEl.textContent = `Filled ${values.length} field(s) from profile (ML-assisted).`;
    });
  } catch (err) {
    console.error("[Heavylift popup] fillFromProfile error:", err);
    statusEl.textContent = "Error filling from profile.";
  }
}

// ---------- event wiring ----------

scanBtn.addEventListener("click", () => {
  scanFields();
});

testFillBtn.addEventListener("click", () => {
  testFill();
});

saveProfileBtn.addEventListener("click", async () => {
  const profile = buildProfileFromInputs();
  await saveProfile(profile);
  statusEl.textContent = "Profile saved.";
});

fillProfileBtn.addEventListener("click", () => {
  fillFromProfile();
});

// On popup open: load profile + scan once
loadProfile().then((profile) => {
  populateProfileInputs(profile);
});
scanFields();
