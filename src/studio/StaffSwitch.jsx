import React from 'react';

// Where staff can be: seeing the site as customers do, or in the Studio, where
// everything is edited. One switch, always visible, so nobody gets stuck in a view.
const MODES = [
  { id: 'customer', label: 'Customer view' },
  { id: 'studio', label: 'Studio' }
];

export function StaffSwitch({ mode, onChange, unread = 0 }) {
  return (
    <div className="st-switch" role="group" aria-label="Staff view">
      {MODES.map(m => (
        <button
          key={m.id}
          type="button"
          className="st-switch-option"
          aria-pressed={mode === m.id}
          onClick={() => mode !== m.id && onChange(m.id)}
        >
          {m.label}
          {m.id === 'studio' && unread > 0 && (
            <span className="st-switch-count" aria-label={`${unread} new`}>{unread}</span>
          )}
        </button>
      ))}
    </div>
  );
}
