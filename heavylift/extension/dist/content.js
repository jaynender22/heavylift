// src/content.ts
// ---- field scanning + filling logic lives here now (no imports) ----
let nextId = 1;
function inferFieldType(el) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'textarea')
        return 'textarea';
    if (tag === 'select')
        return 'select';
    if (tag === 'input') {
        const input = el;
        const t = (input.type || '').toLowerCase();
        if (t === 'checkbox')
            return 'checkbox';
        if (t === 'radio')
            return 'radio';
        if (t === 'email')
            return 'email';
        if (t === 'tel')
            return 'tel';
        if (t === 'url')
            return 'url';
        if (t === 'number')
            return 'number';
        if (t === 'date')
            return 'date';
        return 'text';
    }
    return 'unknown';
}
function findLabelText(element) {
    // 1) <label for="id">
    const id = element.id;
    if (id) {
        const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (label)
            return label.textContent?.trim() || '';
    }
    // 2) Parent <label>
    let parent = element;
    while (parent) {
        if (parent.tagName.toLowerCase() === 'label') {
            return parent.textContent?.trim() || '';
        }
        parent = parent.parentElement;
    }
    // 3) Previous sibling text
    const prev = element.previousElementSibling;
    if (prev && /label|span|p|div/i.test(prev.tagName)) {
        const text = prev.textContent?.trim();
        if (text)
            return text;
    }
    return '';
}
function scanFieldsInDocument() {
    const fields = [];
    const selectors = ['input', 'textarea', 'select'];
    const elements = Array.from(document.querySelectorAll(selectors.join(',')));
    for (const el of elements) {
        // Skip hidden inputs
        if (el.tagName.toLowerCase() === 'input') {
            const input = el;
            if (input.type === 'hidden')
                continue;
        }
        const fieldType = inferFieldType(el);
        const label = findLabelText(el);
        const name = el.name ||
            null;
        const placeholder = el.placeholder || '';
        let options;
        if (el.tagName.toLowerCase() === 'select') {
            options = Array.from(el.options).map((o) => o.textContent?.trim() || '');
        }
        // Ensure id is always a string
        let id = el.getAttribute('data-heavylift-id') || `field-${nextId++}`;
        el.setAttribute('data-heavylift-id', id);
        const field = {
            id,
            domSelector: `[data-heavylift-id="${id}"]`,
            label,
            name,
            placeholder,
            htmlType: el.type || null,
            tagName: el.tagName.toLowerCase(),
            fieldType,
        };
        if (options) {
            field.options = options;
        }
        fields.push(field);
    }
    return fields;
}
function fillField(selector, value) {
    const el = document.querySelector(selector);
    if (!el)
        return;
    if (el.tagName.toLowerCase() === 'input') {
        const input = el;
        if (input.type === 'checkbox') {
            input.checked = Boolean(value);
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }
        if (input.type === 'radio') {
            input.checked = true;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }
        input.value = String(value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return;
    }
    if (el.tagName.toLowerCase() === 'textarea') {
        const textarea = el;
        textarea.value = String(value);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        return;
    }
    if (el.tagName.toLowerCase() === 'select') {
        const select = el;
        const val = String(value).toLowerCase();
        for (const option of Array.from(select.options)) {
            const optionText = option.textContent?.trim().toLowerCase() || '';
            if (optionText === val || option.value.toLowerCase() === val) {
                select.value = option.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                break;
            }
        }
    }
}
// ---- message handler ----
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'SCAN_FIELDS') {
        const fields = scanFieldsInDocument();
        const response = {
            type: 'SCAN_FIELDS_RESULT',
            fields,
        };
        sendResponse(response);
        return true;
    }
    if (message.type === 'FILL_FIELDS') {
        const fillReq = message;
        for (const { fieldId, value } of fillReq.values) {
            const selector = `[data-heavylift-id="${fieldId}"]`;
            fillField(selector, value);
        }
        sendResponse({ ok: true });
        return true;
    }
    return false;
});
export {};
//# sourceMappingURL=content.js.map