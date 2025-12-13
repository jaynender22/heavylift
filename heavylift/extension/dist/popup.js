"use strict";
// src/popup.ts
// ---------- UI logic ----------
const scanBtn = document.getElementById('scanBtn');
const testFillBtn = document.getElementById('testFillBtn');
const fieldList = document.getElementById('fieldList');
let currentFields = [];
function getActiveTab() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (!tab || !tab.id) {
                reject(new Error('No active tab'));
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
        const req = { type: 'SCAN_FIELDS' };
        chrome.tabs.sendMessage(tab.id, req, (response) => {
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
        });
    }
    catch (err) {
        console.error('[Heavylift popup] scanFields error:', err);
        fieldList.innerHTML = '<p>Error scanning fields.</p>';
    }
}
function renderFieldList(fields) {
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
        const values = currentFields
            .filter((f) => ['text', 'textarea', 'email', 'tel', 'url', 'number'].includes(f.fieldType) && f.htmlType !== 'file' // skip file inputs
        )
            .map((f) => ({
            fieldId: f.id,
            value: 'demo',
        }));
        const req = {
            type: 'FILL_FIELDS',
            values,
        };
        chrome.tabs.sendMessage(tab.id, req, (resp) => {
            const err = chrome.runtime.lastError;
            if (err) {
                console.error('[Heavylift popup] sendMessage error (fill):', err);
                return;
            }
            console.log('[Heavylift popup] fill response:', resp);
        });
    }
    catch (err) {
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
//# sourceMappingURL=popup.js.map