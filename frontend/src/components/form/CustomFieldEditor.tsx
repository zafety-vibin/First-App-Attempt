import React, { useState, useEffect } from 'react';
import { TextInput } from './TextInput';
import { TextArea } from './TextArea';
import { Select } from './Select';
import { Checkbox } from './Checkbox';
import { DatePicker } from './DatePicker';
import './CustomFieldEditor.css';

export interface CustomFieldDefinition {
  id: string;
  name: string;
  field_type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox';
  default_value?: any;
  options?: string[]; // For select fields
  required?: boolean;
}

export interface CustomFieldEditorProps {
  customFields: Record<string, any>;
  onChange: (fields: Record<string, any>) => void;
  definitions?: CustomFieldDefinition[];
  error?: string;
}

/**
 * Dynamic form fields editor based on custom field definitions
 * Usage: <CustomFieldEditor customFields={fields} onChange={setFields} definitions={defs} />
 */
export const CustomFieldEditor: React.FC<CustomFieldEditorProps> = ({
  customFields,
  onChange,
  definitions = [],
  error,
}) => {
  const [fields, setFields] = useState<Record<string, any>>(customFields);

  useEffect(() => {
    setFields(customFields);
  }, [customFields]);

  const handleFieldChange = (fieldName: string, value: any) => {
    const updatedFields = { ...fields, [fieldName]: value };
    setFields(updatedFields);
    onChange(updatedFields);
  };

  if (definitions.length === 0) {
    return (
      <div className="custom-field-editor-empty">
        <p className="custom-field-editor-empty-text">No custom fields defined</p>
      </div>
    );
  }

  return (
    <div className="custom-field-editor">
      <h3 className="custom-field-editor-title">Custom Fields</h3>
      {error && (
        <div className="custom-field-editor-error" role="alert">
          {error}
        </div>
      )}
      <div className="custom-field-editor-fields">
        {definitions.map((def) => {
          const value = fields[def.name] ?? def.default_value ?? getDefaultValue(def.field_type);

          switch (def.field_type) {
            case 'text':
              return (
                <TextInput
                  key={def.id}
                  label={def.name}
                  name={def.name}
                  value={value}
                  onChange={(v) => handleFieldChange(def.name, v)}
                  required={def.required}
                />
              );

            case 'textarea':
              return (
                <TextArea
                  key={def.id}
                  label={def.name}
                  name={def.name}
                  value={value}
                  onChange={(v) => handleFieldChange(def.name, v)}
                  required={def.required}
                />
              );

            case 'number':
              return (
                <TextInput
                  key={def.id}
                  label={def.name}
                  name={def.name}
                  value={value?.toString() || ''}
                  onChange={(v) => handleFieldChange(def.name, v ? parseFloat(v) : null)}
                  placeholder="Enter number"
                  required={def.required}
                />
              );

            case 'date':
              return (
                <DatePicker
                  key={def.id}
                  label={def.name}
                  name={def.name}
                  value={value}
                  onChange={(v) => handleFieldChange(def.name, v)}
                />
              );

            case 'select':
              return (
                <Select
                  key={def.id}
                  label={def.name}
                  name={def.name}
                  value={value || ''}
                  onChange={(v) => handleFieldChange(def.name, v)}
                  options={(def.options || []).map((opt) => ({ value: opt, label: opt }))}
                  required={def.required}
                />
              );

            case 'checkbox':
              return (
                <Checkbox
                  key={def.id}
                  label={def.name}
                  name={def.name}
                  checked={value === true || value === 'true'}
                  onChange={(v) => handleFieldChange(def.name, v)}
                />
              );

            default:
              return null;
          }
        })}
      </div>
    </div>
  );
};

function getDefaultValue(fieldType: CustomFieldDefinition['field_type']): any {
  switch (fieldType) {
    case 'text':
    case 'textarea':
      return '';
    case 'number':
      return null;
    case 'date':
      return null;
    case 'select':
      return '';
    case 'checkbox':
      return false;
    default:
      return null;
  }
}
