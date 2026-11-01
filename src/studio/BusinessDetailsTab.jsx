import React, { useState, useEffect } from 'react';

const FIELDS = [
  {
    group: 'Your diary',
    items: [
      { key: 'maxSetupsPerDay', label: 'Most jobs you can do in one day', type: 'number', inputMode: 'numeric', hint: 'When a date reaches this, customers are asked to pick another day.' },
      { key: 'minNoticeDays', label: "Shortest notice you'll take (days)", type: 'number', inputMode: 'numeric' },
      { key: 'holdUntilReply', label: 'New enquiries hold their date', choices: [[true, 'Until I reply'], [false, 'For a set time']] },
      { key: 'holdHours', label: 'Set time to hold an enquiry (hours)', type: 'number', inputMode: 'numeric', showIf: f => f.holdUntilReply === false },
      { key: 'sameDayTurnaround', label: 'Can a prop go out again the day you collect it?', choices: [[true, 'Yes'], [false, 'No']] }
    ]
  },
  {
    group: 'On your quotes and invoices',
    items: [
      { key: 'businessTradingName', label: 'Business name' },
      { key: 'signOffName', label: 'Your name, to sign off messages', hint: 'Leave blank to sign off with the business name only.' },
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

// `groups` shows only some sections: the Calendar shows "Your diary", Settings the rest
export function BusinessDetailsTab({ studioSettings, onSave, groups = null }) {
  const [form, setForm] = useState(studioSettings || {});
  const [state, setState] = useState('idle'); // idle | saving | saved | error

  useEffect(() => { setForm(studioSettings || {}); }, [studioSettings]);

  const sections = FIELDS.filter(sec => (groups ? groups.includes(sec.group) : sec.group !== 'Your diary'));
  const missingBank = sections.some(sec => sec.group.startsWith('Bank')) && (!form.sortCode || !form.accountNumber);

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
          Add your bank details so they go into your quotes and invoices.
        </p>
      )}
      {sections.map(section => (
        <fieldset key={section.group} className="st-fieldset">
          <legend>{section.group}</legend>
          {section.items.filter(f => !f.showIf || f.showIf(form)).map(f => f.choices ? (
            <div key={f.key} className="st-field" role="group" aria-label={f.label}>
              <span className="st-field-label">{f.label}</span>
              <div className="st-filter">
                {f.choices.map(([value, text]) => (
                  <button
                    key={text}
                    type="button"
                    className="st-chip"
                    aria-pressed={(form[f.key] ?? true) === value}
                    onClick={() => { setForm({ ...form, [f.key]: value }); setState('idle'); }}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
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
          {state === 'saving' ? 'Saving' : 'Save'}
        </button>
        <span role="status" className="st-save-state">
          {state === 'saved' && 'Saved'}
          {state === 'error' && 'Not saved. Check your connection and try again.'}
        </span>
      </div>
    </form>
  );
}
