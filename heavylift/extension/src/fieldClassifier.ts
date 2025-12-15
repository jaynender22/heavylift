// src/fieldClassifier.ts

import type { FieldInfo, FieldType } from './types';

let nextId = 1;

function inferFieldType(el: HTMLElement): FieldType {
  const tag = el.tagName.toLowerCase();

  if (tag === 'textarea') return 'textarea';
  if (tag === 'select') return 'select';

  if (tag === 'input') {
    const input = el as HTMLInputElement;
    const t = (input.type || '').toLowerCase();

    if (t === 'checkbox') return 'checkbox';
    if (t === 'radio') return 'radio';
    if (t === 'email') return 'email';
    if (t === 'tel') return 'tel';
    if (t === 'url') return 'url';
    if (t === 'number') return 'number';
    if (t === 'date') return 'date';

    return 'text';
  }

  return 'unknown';
}

/**
 * Find a "question block" of text near a radio group: usually the text
 * immediately above the radios, or in a nearby container.
 */
function findQuestionTextForGroup(radios: HTMLInputElement[]): string {
  if (!radios.length) return '';

  // Use the first radio as an anchor
  let node: HTMLElement | null = radios[0];

  for (let depth = 0; depth < 6 && node; depth++) {
    // 1) Text of the node itself
    const nodeText = node.textContent?.trim() || '';
    if (nodeText && nodeText.length > 30) {
      return nodeText;
    }

    // 2) Previous sibling (common case: question in <p> above radios)
    const prev = node.previousElementSibling as HTMLElement | null;
    if (prev) {
      const prevText = prev.textContent?.trim() || '';
      if (prevText && prevText.length > 30) {
        return prevText;
      }
    }

    node = node.parentElement;
  }

  return '';
}

/**
 * Try to find the label text for a single radio option ("Yes", "No", etc.).
 */
function findOptionLabelForRadio(radio: HTMLInputElement): string {
  // <label for="id">
  const id = radio.id;
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label) {
      const t = label.textContent?.trim();
      if (t) return t;
    }
  }

  // Parent <label>
  const parentLabel = radio.closest('label');
  if (parentLabel) {
    const t = parentLabel.textContent?.trim();
    if (t) return t;
  }

  // Last resort: tiny text near the radio, but avoid long question blocks
  const parent = radio.parentElement as HTMLElement | null;
  if (parent) {
    const text = parent.textContent?.trim() || '';
    if (text && text.length <= 30) {
      return text;
    }
  }

  return '';
}

function findLabelText(element: HTMLElement): string {
  // 1) <label for="id">
  const id = (element as HTMLInputElement).id;
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label) return label.textContent?.trim() || '';
  }

  // 2) Parent <label>
  let parent: HTMLElement | null = element;
  while (parent) {
    if (parent.tagName.toLowerCase() === 'label') {
      return parent.textContent?.trim() || '';
    }
    parent = parent.parentElement;
  }

  // 3) Previous sibling text
  const prev = element.previousElementSibling as HTMLElement | null;
  if (prev && /label|span|p|div/i.test(prev.tagName)) {
    const text = prev.textContent?.trim();
    if (text) return text;
  }

  return '';
}

export function scanFieldsInDocument(): FieldInfo[] {
  const fields: FieldInfo[] = [];

  const selectors = ['input', 'textarea', 'select'];
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(selectors.join(','))
  );

  const handledRadioNames = new Set<string>();

  for (const el of elements) {
    const tag = el.tagName.toLowerCase();

    // Skip hidden inputs
    if (tag === 'input') {
      const input = el as HTMLInputElement;
      if (input.type === 'hidden') continue;

      // ---- Special handling for radio groups ----
      if (input.type === 'radio') {
        const name = input.name;
        if (!name) continue;
        if (handledRadioNames.has(name)) {
          continue; // already processed this group
        }
        handledRadioNames.add(name);

        const radios = Array.from(
          document.querySelectorAll<HTMLInputElement>(
            `input[type="radio"][name="${CSS.escape(name)}"]`
          )
        );
        if (!radios.length) continue;

        const questionText = findQuestionTextForGroup(radios);

        // Collect option labels ("Yes", "No", etc.)
        const optionLabels: string[] = [];
        for (const r of radios) {
          const optLabel = findOptionLabelForRadio(r);
          if (optLabel) optionLabels.push(optLabel);
        }

        // Ensure a shared id for the whole group so we can address it via a single selector
        let id = input.getAttribute('data-heavylift-id');
        if (!id) {
          id = `field-${nextId++}`;
        }
        for (const r of radios) {
          r.setAttribute('data-heavylift-id', id);
        }

        const field: FieldInfo = {
          id,
          domSelector: `input[type="radio"][name="${CSS.escape(name)}"]`,
          label: questionText || optionLabels.join(' / '),
          name: name || null,
          placeholder: '',
          htmlType: 'radio',
          tagName: 'input',
          fieldType: 'radio',
        };

        if (optionLabels.length > 0) {
          field.options = optionLabels;
        }

        fields.push(field);
        continue;
      }
    }

    // ---- Non-radio elements (unchanged from before, just cleaned up) ----
    const fieldType = inferFieldType(el);
    const label = findLabelText(el);
    const name =
      (el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).name ||
      null;
    const placeholder =
      (el as HTMLInputElement | HTMLTextAreaElement).placeholder || '';

    let options: string[] | undefined;
    if (tag === 'select') {
      options = Array.from((el as HTMLSelectElement).options).map(
        (o) => o.textContent?.trim() || ''
      );
    }

    let id = el.getAttribute('data-heavylift-id') || `field-${nextId++}`;
    el.setAttribute('data-heavylift-id', id);

    const field: FieldInfo = {
      id,
      domSelector: `[data-heavylift-id="${id}"]`,
      label,
      name,
      placeholder,
      htmlType: (el as HTMLInputElement).type || null,
      tagName: tag,
      fieldType,
    };

    if (options && options.length > 0) {
      field.options = options;
    }

    fields.push(field);
  }

  return fields;
}

export function fillField(
  selector: string,
  value: string | string[] | boolean
) {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return;

  if (el.tagName.toLowerCase() === 'input') {
    const input = el as HTMLInputElement;

    if (input.type === 'checkbox') {
      input.checked = Boolean(value);
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    if (input.type === 'radio') {
      const name = input.name;
      if (!name) return;

      const desired = String(value).toLowerCase().trim();

      // Find the correct radio in this group based on its label text
      const radios = Array.from(
        document.querySelectorAll<HTMLInputElement>(
          `input[type="radio"][name="${CSS.escape(name)}"]`
        )
      );

      for (const radio of radios) {
        let labelText = '';

        // label[for=id]
        const id = radio.id;
        if (id) {
          const label = document.querySelector(
            `label[for="${CSS.escape(id)}"]`
          );
          if (label) {
            labelText = label.textContent?.trim().toLowerCase() || '';
          }
        }

        // parent <label>
        if (!labelText) {
          const parentLabel = radio.closest('label');
          if (parentLabel) {
            labelText = parentLabel.textContent?.trim().toLowerCase() || '';
          }
        }

        if (!labelText) continue;

        const isYes =
          desired === 'yes' ||
          desired === 'y' ||
          desired === 'true' ||
          desired === 'i am a veteran'; // example positive choice

        const isNo =
          desired === 'no' ||
          desired === 'n' ||
          desired === 'false' ||
          desired === 'i am not a veteran'; // example negative choice

        const matchesDirect = labelText === desired;
        const matchesYes = isYes && labelText.includes('yes');
        const matchesNo = isNo && labelText.includes('no');

        if (matchesDirect || matchesYes || matchesNo) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
      }

      // If nothing matched, do nothing
      return;
    }

    // Normal text-like input
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }

  if (el.tagName.toLowerCase() === 'textarea') {
    const textarea = el as HTMLTextAreaElement;
    textarea.value = String(value);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }

  if (el.tagName.toLowerCase() === 'select') {
    const select = el as HTMLSelectElement;
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
