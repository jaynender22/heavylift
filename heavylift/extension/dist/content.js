"use strict";
// content.ts
(() => {
    const fieldRegistry = new Map();
    console.log("[Heavylift] content script loaded on", window.location.href);
    // ---------- Helpers ----------
    function triggerInputEvents(el) {
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    // React/Lever sometimes cares that the native setter is used
    function setNativeValue(element, value) {
        const proto = element instanceof HTMLInputElement
            ? HTMLInputElement.prototype
            : HTMLTextAreaElement.prototype;
        const desc = Object.getOwnPropertyDescriptor(proto, "value");
        const setter = desc?.set;
        if (setter)
            setter.call(element, value);
        else
            element.value = value;
    }
    function setNativeChecked(input, checked) {
        // Use the native setter so frameworks don't miss it
        const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked");
        const setter = desc?.set;
        if (setter)
            setter.call(input, checked);
        else
            input.checked = checked;
    }
    function fireRadioEvents(input) {
        // Some sites only react to click; others to change.
        input.dispatchEvent(new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window,
        }));
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    function getLabelForElement(el) {
        const id = el.id;
        const labelEl = el.closest("label") ||
            (id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null);
        return labelEl?.textContent?.trim() ?? "";
    }
    function dispatchMouseClick(target) {
        // Dispatch a realistic click sequence; many UIs listen for mouse events.
        const evInit = {
            bubbles: true,
            cancelable: true,
            view: window,
        };
        target.dispatchEvent(new MouseEvent("pointerdown", evInit));
        target.dispatchEvent(new MouseEvent("mousedown", evInit));
        target.dispatchEvent(new MouseEvent("pointerup", evInit));
        target.dispatchEvent(new MouseEvent("mouseup", evInit));
        target.dispatchEvent(new MouseEvent("click", evInit));
    }
    function dispatchKey(el, key) {
        const init = {
            bubbles: true,
            cancelable: true,
            key,
            code: key,
        };
        el.dispatchEvent(new KeyboardEvent("keydown", init));
        el.dispatchEvent(new KeyboardEvent("keyup", init));
    }
    function bestClickableForRadio(input) {
        // On Lever, the input is often inside a <label> (your screenshot shows that).
        const wrapLabel = input.closest("label");
        if (wrapLabel instanceof HTMLElement)
            return wrapLabel;
        // label[for=id]
        if (input.id) {
            const forLabel = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
            if (forLabel instanceof HTMLElement)
                return forLabel;
        }
        // Sometimes a wrapper has role=radio
        const roleRadio = input.closest('[role="radio"]');
        if (roleRadio instanceof HTMLElement)
            return roleRadio;
        // Fallback: click nearest block container
        return input.closest("li, div, fieldset") || input;
    }
    // ---------- Selector / scan ----------
    function getDomSelector(el) {
        const asHtml = el;
        if (asHtml.id)
            return `#${CSS.escape(asHtml.id)}`;
        const parts = [];
        let curr = el;
        while (curr && curr.nodeType === 1 && curr !== document.documentElement) {
            const tag = curr.tagName.toLowerCase();
            const currHtml = curr;
            if (currHtml.id) {
                parts.unshift(`${tag}#${CSS.escape(currHtml.id)}`);
                break;
            }
            const parentEl = curr.parentElement;
            if (!parentEl) {
                parts.unshift(tag);
                break;
            }
            const siblingsSameTag = Array.from(parentEl.children).filter((child) => child.tagName === curr.tagName);
            const idx = siblingsSameTag.indexOf(curr) + 1;
            parts.unshift(`${tag}:nth-of-type(${idx})`);
            curr = parentEl;
        }
        return parts.join(" > ");
    }
    function getFieldType(el) {
        if (el instanceof HTMLTextAreaElement)
            return "textarea";
        if (el instanceof HTMLSelectElement)
            return "select";
        if (el instanceof HTMLInputElement) {
            const t = (el.type || "").toLowerCase();
            if (t === "checkbox")
                return "checkbox";
            if (t === "radio")
                return "radio";
            if (t === "email")
                return "email";
            if (t === "tel")
                return "tel";
            if (t === "url")
                return "url";
            if (t === "number")
                return "number";
            if (t === "date")
                return "date";
            if (["text", "search", "password"].includes(t) || t === "")
                return "text";
        }
        return "unknown";
    }
    function getOptions(el) {
        if (el instanceof HTMLSelectElement) {
            const opts = Array.from(el.options)
                .map((o) => o.textContent?.trim() ?? "")
                .filter(Boolean);
            return opts.length ? opts : undefined;
        }
        return undefined;
    }
    function scanPageFields() {
        fieldRegistry.clear();
        const elements = Array.from(document.querySelectorAll("input, textarea, select"));
        const fields = [];
        elements.forEach((el, index) => {
            const fieldType = getFieldType(el);
            if (fieldType === "unknown")
                return;
            const existingId = el.id;
            const id = existingId || `heavylift-${index}`;
            if (!existingId)
                el.id = id;
            const label = getLabelForElement(el);
            const domSelector = getDomSelector(el);
            const placeholder = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
                ? el.placeholder || undefined
                : undefined;
            const name = el instanceof HTMLInputElement ||
                el instanceof HTMLTextAreaElement ||
                el instanceof HTMLSelectElement
                ? el.name || null
                : undefined;
            const htmlType = el instanceof HTMLInputElement ? el.type || null : undefined;
            const options = getOptions(el);
            const info = {
                id,
                domSelector,
                label,
                tagName: el.tagName.toLowerCase(),
                fieldType,
                ...(placeholder ? { placeholder } : {}),
                ...(name !== undefined ? { name } : {}),
                ...(htmlType !== undefined ? { htmlType } : {}),
                ...(options ? { options } : {}),
            };
            fieldRegistry.set(id, el);
            fields.push(info);
        });
        console.log("[Heavylift] scanned fields:", fields.length);
        return fields;
    }
    // ---------- Fill ----------
    function coerceToBoolean(v) {
        if (typeof v === "boolean")
            return v;
        if (typeof v !== "string")
            return null;
        const s = v.trim().toLowerCase();
        if (["true", "yes", "y", "1", "on"].includes(s))
            return true;
        if (["false", "no", "n", "0", "off"].includes(s))
            return false;
        return null;
    }
    function fillElement(el, value) {
        // Textarea
        if (el instanceof HTMLTextAreaElement) {
            const v = Array.isArray(value) ? value.join(", ") : String(value ?? "");
            el.focus();
            setNativeValue(el, v);
            triggerInputEvents(el);
            el.blur();
            return;
        }
        // Select
        if (el instanceof HTMLSelectElement) {
            const want = Array.isArray(value)
                ? value.map((x) => String(x).trim().toLowerCase())
                : [String(value ?? "").trim().toLowerCase()];
            const options = Array.from(el.options);
            const findOption = (needle) => options.find((o) => {
                const t = (o.textContent ?? "").trim().toLowerCase();
                const v = (o.value ?? "").trim().toLowerCase();
                return t === needle || v === needle || t.includes(needle);
            });
            const firstNeedle = want[0] ?? "";
            const opt = findOption(firstNeedle);
            if (opt)
                el.value = opt.value;
            triggerInputEvents(el);
            return;
        }
        // Input
        if (el instanceof HTMLInputElement) {
            const t = (el.type || "").toLowerCase();
            // Checkbox
            if (t === "checkbox") {
                const b = typeof value === "boolean" ? value : coerceToBoolean(value);
                if (b !== null) {
                    setNativeChecked(el, b);
                    triggerInputEvents(el);
                }
                return;
            }
            // Radio (Lever Yes/No)
            if (t === "radio") {
                // Normalize saved values
                if (typeof value === "boolean")
                    value = value ? "yes" : "no";
                const normalized = String(value ?? "").trim().toLowerCase();
                const name = el.name;
                // Get all radios in this group (or fallback to just this one)
                const radios = name
                    ? Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`))
                    : [el];
                const labelTextFor = (r) => {
                    const lab = r.closest("label") ||
                        (r.id
                            ? document.querySelector(`label[for="${CSS.escape(r.id)}"]`)
                            : null);
                    return (lab?.textContent ?? "").trim().toLowerCase();
                };
                // Try to choose the right radio
                let toSelect = radios.find((r) => r.value.trim().toLowerCase() === normalized) ??
                    radios.find((r) => labelTextFor(r).includes(normalized)) ??
                    null;
                // Strong Yes/No matching (most important)
                if (!toSelect && (normalized === "yes" || normalized === "no")) {
                    const needle = normalized;
                    toSelect =
                        radios.find((r) => labelTextFor(r).includes(needle)) ??
                            radios.find((r) => r.value.toLowerCase().includes(needle)) ??
                            (needle === "yes"
                                ? radios[0] ?? null
                                : radios[radios.length - 1] ?? null);
                }
                if (!toSelect)
                    return;
                // 1) Click the best clickable UI element (label/wrapper)
                const target = bestClickableForRadio(toSelect);
                try {
                    target.scrollIntoView({ block: "center" });
                }
                catch { }
                // Use a real mouse sequence + click
                dispatchMouseClick(target);
                // 2) If it didn't stick, force the checked state + uncheck siblings
                setTimeout(() => {
                    if (!toSelect.checked) {
                        for (const r of radios)
                            setNativeChecked(r, false);
                        setNativeChecked(toSelect, true);
                    }
                    // 3) Make sure Lever/React sees it
                    fireRadioEvents(toSelect);
                }, 50);
                return;
            }
            // Text-like inputs
            const v = Array.isArray(value) ? value.join(", ") : String(value ?? "");
            el.focus();
            setNativeValue(el, v);
            triggerInputEvents(el);
            el.blur();
            return;
        }
    }
    function resolveElement(fieldId) {
        return fieldRegistry.get(fieldId) ?? document.getElementById(fieldId);
    }
    // ---------- Messaging ----------
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (!message || typeof message !== "object")
            return;
        if (message.type === "SCAN_FIELDS") {
            const fields = scanPageFields();
            sendResponse({ fields });
            return true;
        }
        if (message.type === "FILL_FIELDS" && Array.isArray(message.values)) {
            const values = message.values;
            let filled = 0;
            for (const item of values) {
                const fieldId = item?.fieldId;
                if (!fieldId)
                    continue;
                const el = resolveElement(fieldId);
                if (!el)
                    continue;
                fillElement(el, item.value);
                filled += 1;
            }
            sendResponse({ ok: true, filled });
            return true;
        }
        // Backward compatible: { type: "APPLY_ANSWERS", answers: { [id]: string } }
        if (message.type === "APPLY_ANSWERS" && message.answers) {
            const answers = message.answers;
            let filled = 0;
            for (const [id, value] of Object.entries(answers)) {
                const el = resolveElement(id);
                if (!el)
                    continue;
                fillElement(el, value);
                filled += 1;
            }
            sendResponse({ ok: true, filled });
            return true;
        }
        return;
    });
})();
//# sourceMappingURL=content.js.map