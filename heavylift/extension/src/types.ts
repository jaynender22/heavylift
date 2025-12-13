// src/types.ts

export type FieldType =
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

export interface FieldInfo {
  id: string;               // our internal ID (data-heavylift-id)
  domSelector: string;      // CSS selector to find the element again
  label: string;
  placeholder?: string;
  name?: string | null;
  htmlType?: string | null; // input[type]
  tagName: string;
  fieldType: FieldType;
  options?: string[];       // for select, radio, checkbox groups
}

export interface ScanFieldsRequest {
  type: 'SCAN_FIELDS';
}

export interface ScanFieldsResponse {
  type: 'SCAN_FIELDS_RESULT';
  fields: FieldInfo[];
}

export interface FillFieldsRequest {
  type: 'FILL_FIELDS';
  values: { fieldId: string; value: string | string[] | boolean }[];
}

// Anything the content script might receive
export type ContentMessage = ScanFieldsRequest | FillFieldsRequest;
