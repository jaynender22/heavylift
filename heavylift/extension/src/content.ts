// content.ts

(() => {
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
    tagName: string;
    fieldType: PopupFieldType;

    // With exactOptionalPropertyTypes: omit keys entirely when undefined
    placeholder?: string;
    name?: string | null;
    htmlType?: string | null;
    options?: string[];
  }

  interface FillFieldValue {
    fieldId: string;
    value: string | string[] | boolean;
    strategy?: string;
  }

  const fieldRegistry = new Map<string, HTMLElement>();

  console.log("[Heavylift] content script loaded on", window.location.href);

  // ---------- Helpers ----------

  function triggerInputEvents(el: HTMLElement) {
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // React/Lever sometimes cares that the native setter is used
  function setNativeValue(
    element: HTMLInputElement | HTMLTextAreaElement,
    value: string
  ) {
    const proto =
      element instanceof HTMLInputElement
        ? HTMLInputElement.prototype
        : HTMLTextAreaElement.prototype;

    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    const setter = desc?.set;
    if (setter) setter.call(element, value);
    else (element as any).value = value;
  }

  function setNativeChecked(input: HTMLInputElement, checked: boolean) {
    // Use the native setter so frameworks don't miss it
    const desc = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "checked"
    );
    const setter = desc?.set;
    if (setter) setter.call(input, checked);
    else input.checked = checked;
  }

  function fireRadioEvents(input: HTMLInputElement) {
    // Some sites only react to click; others to change.
    input.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      })
    );
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function getLabelForElement(el: HTMLElement): string {
    const id = el.id;
    const labelEl =
      el.closest("label") ||
      (id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null);

    return labelEl?.textContent?.trim() ?? "";
  }

  function dispatchMouseClick(target: HTMLElement) {
    // Dispatch a realistic click sequence; many UIs listen for mouse events.
    const evInit: MouseEventInit = {
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

  function dispatchKey(el: HTMLElement, key: string) {
    const init: KeyboardEventInit = {
      bubbles: true,
      cancelable: true,
      key,
      code: key,
    };
    el.dispatchEvent(new KeyboardEvent("keydown", init));
    el.dispatchEvent(new KeyboardEvent("keyup", init));
  }

  function isTextLikeInputType(t: string): boolean {
  const tt = (t || "").toLowerCase();
  return ["", "text", "search", "password"].includes(tt);
}

  function isComboBoxLikeInput(input: HTMLInputElement): boolean {
    const role = (input.getAttribute("role") || "").toLowerCase();
    const ariaAutocomplete = (input.getAttribute("aria-autocomplete") || "").toLowerCase();
    const ariaControls = input.getAttribute("aria-controls") || input.getAttribute("aria-owns") || "";
    const hasList = !!input.getAttribute("list");

    // Common signals for ATS-style location pickers (Lever/Greenhouse/etc.)
    return (
      role === "combobox" ||
      ariaAutocomplete === "list" ||
      ariaAutocomplete === "both" ||
      ariaControls.length > 0 ||
      hasList
    );
  }

  function trySelectComboOption(input: HTMLInputElement, desired: string): boolean {
    const desiredLower = desired.trim().toLowerCase();
    if (!desiredLower) return false;

    const listId = input.getAttribute("aria-controls") || input.getAttribute("aria-owns");
    const listEl = listId ? document.getElementById(listId) : null;

    const candidates: HTMLElement[] = [];

    if (listEl) {
      candidates.push(
        ...Array.from(
          listEl.querySelectorAll<HTMLElement>(
            '[role="option"], li[role="option"], div[role="option"], li, div'
          )
        )
      );
    }

    // Fallback: any listbox options in the document (common pattern)
    if (!candidates.length) {
      candidates.push(
        ...Array.from(
          document.querySelectorAll<HTMLElement>(
            '[role="listbox"] [role="option"], [role="listbox"] li'
          )
        )
      );
    }

    const match =
      candidates.find((c) => (c.textContent || "").trim().toLowerCase().includes(desiredLower)) ||
      candidates[0];

    if (!match) return false;

    try {
      match.scrollIntoView({ block: "nearest" });
    } catch {}

    dispatchMouseClick(match);
    return true;
  }

  function fillComboBox(input: HTMLInputElement, desired: string) {
    const v = String(desired ?? "").trim();
    if (!v) return;

    input.focus();

    // Clear first (many comboboxes require a change to trigger suggestions)
    setNativeValue(input, "");
    triggerInputEvents(input);

    setNativeValue(input, v);
    triggerInputEvents(input);

    // Give the UI a moment to render suggestions
    setTimeout(() => {
      const clicked = trySelectComboOption(input, v);

      // Fallback: keyboard selection (ArrowDown + Enter)
      if (!clicked) {
        dispatchKey(input, "ArrowDown");
        dispatchKey(input, "Enter");
      }

      triggerInputEvents(input);
      input.blur();
    }, 200);
  }


  function bestClickableForRadio(input: HTMLInputElement): HTMLElement {
    // On Lever, the input is often inside a <label> (your screenshot shows that).
    const wrapLabel = input.closest("label");
    if (wrapLabel instanceof HTMLElement) return wrapLabel;

    // label[for=id]
    if (input.id) {
      const forLabel = document.querySelector(
        `label[for="${CSS.escape(input.id)}"]`
      );
      if (forLabel instanceof HTMLElement) return forLabel;
    }

    // Sometimes a wrapper has role=radio
    const roleRadio = input.closest('[role="radio"]');
    if (roleRadio instanceof HTMLElement) return roleRadio;

    // Fallback: click nearest block container
    return (input.closest("li, div, fieldset") as HTMLElement) || input;
  }


  function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function scanPageFieldsWithLazyLoad(): Promise<PopupFieldInfo[]> {
    // First scan (whatever is currently rendered)
    let fields = scanPageFields();

    // Force lazy sections to render (GPA is commonly below)
    try {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" as any });
    } catch {
      window.scrollTo(0, document.body.scrollHeight);
    }

    await sleep(400);

    // Re-scan after scrolling (now GPA usually exists)
    fields = scanPageFields();

    return fields;
  }

  // ---------- Selector / scan ----------

  function getDomSelector(el: Element): string {
    const asHtml = el as HTMLElement;
    if (asHtml.id) return `#${CSS.escape(asHtml.id)}`;

    const parts: string[] = [];
    let curr: Element | null = el;

    while (curr && curr.nodeType === 1 && curr !== document.documentElement) {
      const tag = curr.tagName.toLowerCase();

      const currHtml = curr as HTMLElement;
      if (currHtml.id) {
        parts.unshift(`${tag}#${CSS.escape(currHtml.id)}`);
        break;
      }

      const parentEl: Element | null = curr.parentElement;
      if (!parentEl) {
        parts.unshift(tag);
        break;
      }

      const siblingsSameTag = (Array.from(parentEl.children) as Element[]).filter(
        (child) => child.tagName === curr!.tagName
      );
      const idx = siblingsSameTag.indexOf(curr) + 1;
      parts.unshift(`${tag}:nth-of-type(${idx})`);

      curr = parentEl;
    }

    return parts.join(" > ");
  }

  function getFieldType(el: HTMLElement): PopupFieldType {
    if (el instanceof HTMLTextAreaElement) return "textarea";
    if (el instanceof HTMLSelectElement) return "select";

    if (el instanceof HTMLInputElement) {
      const t = (el.type || "").toLowerCase();
      if (t === "checkbox") return "checkbox";
      if (t === "radio") return "radio";
      if (t === "email") return "email";
      if (t === "tel") return "tel";
      if (t === "url") return "url";
      if (t === "number") return "number";
      if (t === "date") return "date";
      if (["text", "search", "password"].includes(t) || t === "") return "text";
    }

    return "unknown";
  }

  function getOptions(el: HTMLElement): string[] | undefined {
    if (el instanceof HTMLSelectElement) {
      const opts = Array.from(el.options)
        .map((o) => o.textContent?.trim() ?? "")
        .filter(Boolean);
      return opts.length ? opts : undefined;
    }
    return undefined;
  }

  function scanPageFields(): PopupFieldInfo[] {
    fieldRegistry.clear();

    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("input, textarea, select")
    );

    const fields: PopupFieldInfo[] = [];

    elements.forEach((el, index) => {
      const fieldType = getFieldType(el);
      if (fieldType === "unknown") return;

      const existingId = el.id;
      const id = existingId || `heavylift-${index}`;
      if (!existingId) el.id = id;

      const label = getLabelForElement(el);
      const domSelector = getDomSelector(el);

      const placeholder =
        el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
          ? el.placeholder || undefined
          : undefined;

      const name =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement
          ? el.name || null
          : undefined;

      const htmlType = el instanceof HTMLInputElement ? el.type || null : undefined;

      const options = getOptions(el);

      const info: PopupFieldInfo = {
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

  function coerceToBoolean(v: unknown): boolean | null {
    if (typeof v === "boolean") return v;
    if (typeof v !== "string") return null;
    const s = v.trim().toLowerCase();
    if (["true", "yes", "y", "1", "on"].includes(s)) return true;
    if (["false", "no", "n", "0", "off"].includes(s)) return false;
    return null;
  }

  function fillElement(el: HTMLElement, value: string | string[] | boolean) {
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

      const findOption = (needle: string) =>
        options.find((o) => {
          const t = (o.textContent ?? "").trim().toLowerCase();
          const v = (o.value ?? "").trim().toLowerCase();
          return t === needle || v === needle || t.includes(needle);
        });

      const firstNeedle = want[0] ?? "";
      const opt = findOption(firstNeedle);
      if (opt) el.value = opt.value;

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
        if (typeof value === "boolean") value = value ? "yes" : "no";
        const normalized = String(value ?? "").trim().toLowerCase();

        const name = el.name;

        // Get all radios in this group (or fallback to just this one)
        const radios = name
          ? Array.from(
              document.querySelectorAll<HTMLInputElement>(
                `input[type="radio"][name="${CSS.escape(name)}"]`
              )
            )
          : [el];

        const labelTextFor = (r: HTMLInputElement) => {
          const lab =
            r.closest("label") ||
            (r.id
              ? document.querySelector(`label[for="${CSS.escape(r.id)}"]`)
              : null);
          return (lab?.textContent ?? "").trim().toLowerCase();
        };

        // Try to choose the right radio
        let toSelect: HTMLInputElement | null =
          radios.find((r) => r.value.trim().toLowerCase() === normalized) ??
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

        if (!toSelect) return;

        // 1) Click the best clickable UI element (label/wrapper)
        const target = bestClickableForRadio(toSelect);
        try {
          target.scrollIntoView({ block: "center" });
        } catch {}

        // Use a real mouse sequence + click
        dispatchMouseClick(target);

        // 2) If it didn't stick, force the checked state + uncheck siblings
        setTimeout(() => {
          if (!toSelect!.checked) {
            for (const r of radios) setNativeChecked(r, false);
            setNativeChecked(toSelect!, true);
          }

          // 3) Make sure Lever/React sees it
          fireRadioEvents(toSelect!);
        }, 50);

        return;
      }

      // Text-like inputs (including autocomplete/combobox fields like "Current location")
      const v = Array.isArray(value) ? value.join(", ") : String(value ?? "");

      if (isTextLikeInputType(t) && isComboBoxLikeInput(el)) {
        fillComboBox(el, v);
        return;
      }

      el.focus();
      setNativeValue(el, v);
      triggerInputEvents(el);
      el.blur();
      return;

    }
  }

  function resolveElement(fieldId: string): HTMLElement | null {
    return fieldRegistry.get(fieldId) ?? document.getElementById(fieldId);
  }

  // ---------- Messaging ----------

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== "object") return;

    if (message.type === "SCAN_FIELDS") {
      scanPageFieldsWithLazyLoad()
        .then((fields) => sendResponse({ fields }))
        .catch((e) => {
          console.error("[Heavylift] scan failed:", e);
          sendResponse({ fields: [] });
        });
      return true;
    }

    if (message.type === "GET_FIELD_VALUES" && Array.isArray(message.fieldIds)) {
      const fieldIds: string[] = message.fieldIds;
      const values = fieldIds.map((id) => {
        const el = resolveElement(id) as any;
        if (!el) {
          return { fieldId: id, value: null, selectedText: null };
        }

        if (el instanceof HTMLSelectElement) {
          const opt = el.selectedOptions?.[0];
          return {
            fieldId: id,
            value: el.value ?? "",
            selectedText: opt?.textContent ?? "",
          };
        }

        if (el instanceof HTMLInputElement && el.type === "radio") {
          const name = el.name;
          const checked = name
            ? (document.querySelector(
                `input[type="radio"][name="${CSS.escape(name)}"]:checked`
              ) as HTMLInputElement | null)
            : el.checked
            ? el
            : null;

          return {
            fieldId: id,
            value: checked?.value ?? "",
            selectedText: checked ? checked.value : "",
          };
        }

        return {
          fieldId: id,
          value: (el.value ?? "").toString(),
          selectedText: null,
        };
      });

      sendResponse({ values });
      return true;
    }


    if (message.type === "FILL_FIELDS" && Array.isArray(message.values)) {
      const values = message.values as FillFieldValue[];

      let filled = 0;
      for (const item of values) {
        const fieldId = item?.fieldId;
        if (!fieldId) continue;

        const el = resolveElement(fieldId);
        if (!el) continue;

        if (item.strategy === "select_exact" && el instanceof HTMLSelectElement) {
          const want = String(item.value ?? "").trim().toLowerCase();
          let matched = false;
          for (const opt of Array.from(el.options)) {
            const text = (opt.textContent || "").trim().toLowerCase();
            const val = (opt.value || "").trim().toLowerCase();
            if (text === want || val === want) {
              el.value = opt.value;
              triggerInputEvents(el);
              matched = true;
              break;
            }
          }
          if (!matched) {
            fillElement(el, item.value);
          }
        } else if (item.strategy === "radio_label" && el instanceof HTMLInputElement && el.type === "radio") {
          // your existing radio handling in fillElement is label-aware
          fillElement(el, item.value);
        } else {
          fillElement(el, item.value);
        }

        filled += 1;
      }

      sendResponse({ ok: true, filled });
      return true;
    }


    // Backward compatible: { type: "APPLY_ANSWERS", answers: { [id]: string } }
    if (message.type === "APPLY_ANSWERS" && message.answers) {
      const answers: Record<string, string> = message.answers;

      let filled = 0;
      for (const [id, value] of Object.entries(answers)) {
        const el = resolveElement(id);
        if (!el) continue;

        fillElement(el, value);
        filled += 1;
      }

      sendResponse({ ok: true, filled });
      return true;
    }

    return;
  });
})();
