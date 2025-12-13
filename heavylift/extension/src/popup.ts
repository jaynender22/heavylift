// src/popup.ts

// Local types (popup-only, prefixed)

type PopupFieldType =
  | 'text'
  | 'textarea'
  | 'checkbox'
  | 'radio'
  | 'select'
  | 'email'
  | 'tel'
  | 'url'
  | 'number'
  | 'date'
  | 'unknown';

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
  type: 'SCAN_FIELDS';
}

interface PopupScanFieldsResponse {
  type: 'SCAN_FIELDS_RESULT';
  fields: PopupFieldInfo[];
}

interface PopupFillFieldValue {
  fieldId: string;
  value: string | string[] | boolean;
}

interface PopupFillFieldsRequest {
  type: 'FILL_FIELDS';
  values: PopupFillFieldValue[];
}

// ---------- UI logic ----------

const scanBtn = document.getElementById('scanBtn') as HTMLButtonElement;
const testFillBtn = document.getElementById('testFillBtn') as HTMLButtonElement;
const fieldList = document.getElementById('fieldList') as HTMLDivElement;

let currentFields: PopupFieldInfo[] = [];

function getActiveTab(): Promise<chrome.tabs.Tab> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.id) {
        reject(new Error('No active tab'));
      } else {
        resolve(tab);
      }
    });
  });
}

async function scanFields() {
  try {
    const tab = await getActiveTab();
    const req: PopupScanFieldsRequest = { type: 'SCAN_FIELDS' };

    chrome.tabs.sendMessage(
      tab.id!,
      req,
      (response?: PopupScanFieldsResponse) => {
        const err = chrome.runtime.lastError;
        if (err) {
          console.error('[Heavylift popup] sendMessage error:', err);
          fieldList.innerHTML = `<p>Error talking to page: ${err.message}</p>`;
          return;
        }

        if (!response || !response.fields) {
          fieldList.innerHTML = '<p>Could not read fields on this page.</p>';
          return;
        }

        currentFields = response.fields;
        renderFieldList(currentFields);
      }
    );
  } catch (err) {
    console.error('[Heavylift popup] scanFields error:', err);
    fieldList.innerHTML = '<p>Error scanning fields.</p>';
  }
}

function renderFieldList(fields: PopupFieldInfo[]) {
  if (!fields.length) {
    fieldList.innerHTML = '<p>No fields detected.</p>';
    return;
  }

  fieldList.innerHTML = fields
    .map((f) => {
      const label = f.label || '(no label)';
      const metaPieces = [
        f.fieldType,
        f.tagName,
        f.name ? `name="${f.name}"` : '',
        f.placeholder ? `ph="${f.placeholder}"` : '',
      ].filter(Boolean);

      return `
        <div class="field-item">
          <div class="label">${label}</div>
          <div class="meta">${metaPieces.join(' • ')}</div>
        </div>
      `;
    })
    .join('');
}

async function testFill() {
  if (!currentFields.length) {
    await scanFields();
  }

  try {
    const tab = await getActiveTab();

    const values: PopupFillFieldsRequest['values'] = currentFields
      .filter(
        (f) =>
          ['text', 'textarea', 'email', 'tel', 'url', 'number'].includes(
            f.fieldType
          ) && f.htmlType !== 'file' // skip file inputs
      )
      .map((f) => ({
        fieldId: f.id,
        value: 'demo',
      }));

    const req: PopupFillFieldsRequest = {
      type: 'FILL_FIELDS',
      values,
    };

    chrome.tabs.sendMessage(tab.id!, req, (resp) => {
      const err = chrome.runtime.lastError;
      if (err) {
        console.error('[Heavylift popup] sendMessage error (fill):', err);
        return;
      }
      console.log('[Heavylift popup] fill response:', resp);
    });
  } catch (err) {
    console.error('[Heavylift popup] testFill error:', err);
  }
}

scanBtn.addEventListener('click', () => {
  scanFields();
});

testFillBtn.addEventListener('click', () => {
  testFill();
});

// Auto-scan when popup opens
scanFields();
