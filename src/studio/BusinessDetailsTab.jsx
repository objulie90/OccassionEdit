import React, { useState, useEffect } from 'react';

const FIELDS = [
  {
    group: 'On your quotes and invoices',
    items: [
      { key: 'businessTradingName', label: 'Business name' },
      { key: 'studioPhone', label: 'Phone number', type: 'tel' },
      { key: 'studioEmail', label: 'Email address', type: 'email' },
      { key: 'studioAddress', label: 'Address', hint: 'Town and postcode is enough.' }
    ]
  },
  {
    group: 'Bank details customers pay into',
    items: [
      { key: 'bankName', label: 'Bank' },
      { key: 'accountName', label: 'Name on the account' },
      { key: 'sortCode', label: 'Sort code', inputMode: 'numeric', placeholder: '00-00-00' },
      { key: 'accountNumber', label: 'Account number', inputMode: 'numeric' }
    ]
  }
];

export function BusinessDetailsTab({ studioSettings, onSave }) {
  const [form, setForm] = useState(studioSettings || {});
  const [state, setState] = useState('idle'); // idle | saving | saved | error

  useEffect(() => { setForm(studioSettings || {}); }, [studioSettings]);

  const missingBank = !form.sortCode || !form.accountNumber;

  const submit = async (e) => {
    e.preventDefault();
    if (!onSave) return;
    setState('saving');
    try {
      await onSave(form);
      setState('saved');
    } catch (_err) {
      setState('error');
    }
  };

  return (
    <form className="st-business" onSubmit={submit}>
      {missingBank && (
        <p className="st-warning" role="note">
          Add your bank details before sending any invoice, so customers know where to pay.
        </p>
      )}
      {FIELDS.map(section => (
        <fieldset key={section.group} className="st-fieldset">
          <legend>{section.group}</legend>
          {section.items.map(f => (
            <div key={f.key} className="st-field">
              <label htmlFor={`st-${f.key}`}>{f.label}</label>
              <input
                id={`st-${f.key}`}
                type={f.type || 'text'}
                inputMode={f.inputMode}
                placeholder={f.placeholder}
                value={form[f.key] || ''}
                onChange={e => { setForm({ ...form, [f.key]: e.target.value }); setState('idle'); }}
              />
              {f.hint && <span className="st-hint">{f.hint}</span>}
            </div>
          ))}
        </fieldset>
      ))}
      <div className="st-business-actions">
        <button type="submit" className="st-btn st-btn-primary" disabled={state === 'saving'}>
          {state === 'saving' ? 'Saving' : 'Save details'}
        </button>
        <span role="status" className="st-save-state">
          {state === 'saved' && 'Saved'}
          {state === 'error' && 'Not saved. Check your connection and try again.'}
        </span>
      </div>
    </form>
  );
}
