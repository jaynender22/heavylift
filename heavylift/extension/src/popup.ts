// src/popup.ts

import type {
  ScanFieldsRequest,
  ScanFieldsResponse,
  FillFieldsRequest,
  FieldInfo,
} from './types';

const scanBtn = document.getElementById('scanBtn') as HTMLButtonElement;
const testFillBtn = document.getElementById(
  'testFillBtn'
) as HTMLButtonElement;
const fieldList = document.getElementById('fieldList') as HTMLDivElement;

let currentFields: FieldInfo[] = [];

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
    const req: ScanFieldsRequest = { type: 'SCAN_FIELDS' };

    chrome.tabs.sendMessage(
      tab.id!,
      req,
      (response: ScanFieldsResponse | undefined) => {
        if (!response || !response.fields) {
          fieldList.innerHTML = '<p>Could not read fields on this page.</p>';
          return;
        }

        currentFields = response.fields;
        renderFieldList(currentFields);
      }
    );
  } catch (err) {
    console.error(err);
    fieldList.innerHTML = '<p>Error scanning fields.</p>';
  }
}

function renderFieldList(fields: FieldInfo[]) {
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

    const values: FillFieldsRequest['values'] = currentFields
      .filter((f) =>
        ['text', 'textarea', 'email', 'tel', 'url', 'number'].includes(
          f.fieldType
        )
      )
      .map((f) => ({
        fieldId: f.id,
        value: 'demo',
      }));

    const req: FillFieldsRequest = {
      type: 'FILL_FIELDS',
      values,
    };

    chrome.tabs.sendMessage(tab.id!, req, (resp) => {
      console.log('Fill response:', resp);
    });
  } catch (err) {
    console.error('Test fill error:', err);
  }
}

scanBtn.addEventListener('click', () => {
  scanFields();
});

testFillBtn.addEventListener('click', () => {
  testFill();
});

scanFields();
