// content.ts

type FieldKind = 'text' | 'textarea' | 'radio' | 'select';

interface ScannedField {
  id: string;
  label: string;
  kind: FieldKind;
}

const fieldRegistry = new Map<string, HTMLElement>();

console.log('[Heavylift] content script loaded on', window.location.href);

/**
 * Fire the events frameworks (React/Lever) listen to so they
 * notice that we changed the field.
 */
function triggerInputEvents(el: HTMLElement) {
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Find associated label text for an element.
 */
function getLabelForElement(el: HTMLElement): string {
  const id = el.id;
  const labelEl =
    el.closest('label') ||
    (id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null);

  return labelEl?.textContent?.trim() ?? '';
}

/**
 * Scan the page for fields we can fill.
 */
function scanPageFields(): ScannedField[] {
  const fields: ScannedField[] = [];
  fieldRegistry.clear();

  const elements = document.querySelectorAll<HTMLElement>(
    'input, textarea, select'
  );

  elements.forEach((el, index) => {
    let kind: FieldKind | null = null;

    if (el instanceof HTMLTextAreaElement) {
      kind = 'textarea';
    } else if (el instanceof HTMLInputElement) {
      if (
        ['text', 'email', 'tel', 'url', 'number', 'search'].includes(
          el.type
        )
      ) {
        kind = 'text';
      } else if (el.type === 'radio') {
        kind = 'radio';
      }
    } else if (el instanceof HTMLSelectElement) {
      kind = 'select';
    }

    if (!kind) return;

    const existingId = el.id;
    const id = existingId || `heavylift-${index}`;
    if (!existingId) el.id = id;

    const labelEl =
      el.closest('label') ||
      document.querySelector(`label[for="${CSS.escape(id)}"]`);

    const label = labelEl?.textContent?.trim() ?? '';

    fieldRegistry.set(id, el);
    fields.push({ id, label, kind });
  });

  console.log('[Heavylift] scanned fields:', fields.length);
  return fields;
}



/**
 * Fill a single field with the given answer.
 */
function fillField(element: HTMLElement, answer: string) {
  if (!element) return;

  const trimmed = answer.trim();
  const normalized = trimmed.toLowerCase();

  // 1) Input elements
  if (element instanceof HTMLInputElement) {
    // Text-like
    if (
      ['text', 'email', 'tel', 'url', 'number', 'search'].includes(
        element.type
      )
    ) {
      element.focus();
      element.value = trimmed;
      triggerInputEvents(element);
      return;
    }

    // Radios (Yes/No etc.)
    if (element.type === 'radio') {
      const name = element.name;
      if (!name) return;

      const radios = Array.from(
        document.querySelectorAll<HTMLInputElement>(
          `input[type="radio"][name="${CSS.escape(name)}"]`
        )
      );

      // Start with direct value match
      let toSelect: HTMLInputElement | null =
        radios.find(
          r => r.value.trim().toLowerCase() === normalized
        ) ?? null;

      // Then try label text match
      if (!toSelect) {
        toSelect =
          radios.find(r => {
            const label =
              r.closest('label') ||
              document.querySelector(`label[for="${r.id}"]`);
            const labelText = label?.textContent?.toLowerCase() ?? '';
            return labelText.includes(normalized);
          }) ?? null;
      }

      // Special-case yes/no, very common pattern
      if (!toSelect && (normalized === 'yes' || normalized === 'no')) {
        const findBy = (substr: string): HTMLInputElement | undefined => {
          const needle = substr.toLowerCase();
          return radios.find(r => {
            const label =
              r.closest('label') ||
              document.querySelector(`label[for="${r.id}"]`);
            const labelText = label?.textContent?.toLowerCase() ?? '';
            return (
              r.value.toLowerCase().includes(needle) ||
              labelText.includes(needle)
            );
          });
        };

        const yesRadio = findBy('yes');
        const noRadio = findBy('no');

        let candidate: HTMLInputElement | undefined;
        if (normalized === 'yes') {
          candidate = yesRadio ?? radios[0];
        } else {
          candidate = noRadio ?? radios[radios.length - 1];
        }

        toSelect = candidate ?? null;
      }

      if (toSelect) {
        if (!toSelect.checked) {
          // click so any JS click handlers run too
          toSelect.click();
        }
        triggerInputEvents(toSelect);
      }

      return;
    }
  }

  // 2) Native dropdowns (Gender, Race, Veteran status, etc.)
  if (element instanceof HTMLSelectElement) {
    const options = Array.from(element.options);

    let match: HTMLOptionElement | null =
      options.find(
        o =>
          o.text.trim().toLowerCase() === normalized ||
          o.value.trim().toLowerCase() === normalized
      ) ?? null;

    // Soft matching for common phrasing
    if (!match) {
      const textIncludes = (substr: string) =>
        options.find(o =>
          o.text.toLowerCase().includes(substr.toLowerCase())
        ) ?? null;

      if (normalized.includes('not a veteran')) {
        match = textIncludes('not a veteran');
      } else if (normalized.includes('male')) {
        match = textIncludes('male');
      } else if (normalized.includes('female')) {
        match = textIncludes('female');
      }
      // You can add more patterns once you see exact Race labels
    }

    if (match) {
      element.value = match.value;
      triggerInputEvents(element);
    }

    return;
  }

  // 3) Textareas
  if (element instanceof HTMLTextAreaElement) {
    element.focus();
    element.value = trimmed;
    triggerInputEvents(element);
  }
}

/**
 * Message wiring.
 * If your popup/background uses different message types,
 * tweak the `message.type` strings below.
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[Heavylift] received message', message);

  if (!message || typeof message !== 'object') return;

  // Ask the content script to scan fields
  if (message.type === 'SCAN_FIELDS') {
    const fields = scanPageFields();
    sendResponse({ fields });
    return true;
  }

  // Ask the content script to fill fields: { answers: { [id]: string } }
  if (message.type === 'APPLY_ANSWERS' && message.answers) {
    const answers: Record<string, string> = message.answers;

    Object.entries(answers).forEach(([id, value]) => {
      const el = fieldRegistry.get(id);
      if (el) {
        fillField(el, value);
      }
    });

    sendResponse({ ok: true });
    return true;
  }

  return;
});

// Make this a module so TS doesn't treat it as global script.

