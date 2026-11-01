import React, { useState, useEffect, useRef } from 'react';

function when(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/**
 * Every email to and from this customer, and a box to write the next one.
 * Sent from Laura's own Gmail, so replies come back to her inbox as normal.
 */
export function EmailPanel({ order, google, onOpenTab }) {
  const c = order.client || {};
  const first = (c.name || '').split(' ')[0] || 'the customer';
  const ready = google?.status?.gmail;
  const messages = c.messages || [];
  const docs = (order.documents || []).filter(d => d.status !== 'void' && d.status !== 'replaced');
  const [subject, setSubject] = useState(`Your celebration with The Occasion Edit (${order.id})`);
  const [body, setBody] = useState('');
  const [attach, setAttach] = useState('');
  const [state, setState] = useState('');
  const [checking, setChecking] = useState(false);
  const checkedFor = useRef(null);

  const check = async () => {
    setChecking(true);
    try {
      const n = await google.checkEmail(order);
      setState(n ? `${n} new email${n === 1 ? '' : 's'} from ${first}.` : 'No new emails.');
    } catch (e) {
      setState(e.message);
    }
    setChecking(false);
  };

  // Opening the order is the moment to look for replies
  useEffect(() => {
    if (ready && c.email && checkedFor.current !== order.id) {
      checkedFor.current = order.id;
      google.checkEmail(order).catch(() => {});
    }
  }, [ready, c.email, order.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (e) => {
    e.preventDefault();
    setState('sending');
    const doc = docs.find(d => d.id === attach);
    try {
      await google.sendEmail(order, { subject: subject.trim(), body: body.trim(), documentId: doc?.id, attachmentName: doc?.number });
      setBody('');
      setAttach('');
      setState(`Sent to ${c.email}.`);
    } catch (err) {
      setState(err.message);
    }
  };

  return (
    <section className="st-panel st-panel-wide" aria-labelledby={`st-emails-${order.id}`}>
      <div className="st-panel-head">
        <h4 id={`st-emails-${order.id}`} className="st-panel-title">Emails with {first}</h4>
        {ready && c.email && (
          <button type="button" className="st-btn" onClick={check} disabled={checking}>{checking ? 'Checking' : 'Check for new emails'}</button>
        )}
      </div>

      {!ready && (
        <div className="st-callout">
          <p>Connect your Google account once, and you can email {first} from here. Every email to and from them is kept on this order.</p>
          {onOpenTab && <button type="button" className="st-btn st-btn-primary" onClick={() => onOpenTab('paperwork')}>Connect Google</button>}
        </div>
      )}

      {ready && !c.email && <p className="st-cat-note">There's no email address for {first} on this order yet.</p>}

      {messages.length > 0 && (
        <ol className="st-mail-log" aria-label={`Emails with ${first}`}>
          {messages.map(m => (
            <li key={m.id} className={`st-mail is-${m.dir}`}>
              <div className="st-mail-meta">
                <strong>{m.dir === 'in' ? c.name || first : 'You'}</strong>
                <span>{when(m.at)}</span>
              </div>
              {m.subject && <p className="st-mail-subject">{m.subject}</p>}
              <p className="st-mail-text">{m.text}</p>
              {m.attachment && <p className="st-mail-attachment">Attached: {m.attachment}</p>}
            </li>
          ))}
        </ol>
      )}
      {ready && c.email && messages.length === 0 && <p className="st-cat-note">No emails with {first} yet.</p>}

      {ready && c.email && (
        <form className="st-mail-compose" onSubmit={send}>
          <div className="st-field">
            <label htmlFor={`st-mail-subject-${order.id}`}>Subject</label>
            <input id={`st-mail-subject-${order.id}`} type="text" maxLength={200} value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div className="st-field">
            <label htmlFor={`st-mail-body-${order.id}`}>Message to {first}</label>
            <textarea id={`st-mail-body-${order.id}`} rows={6} value={body} onChange={e => setBody(e.target.value)} />
          </div>
          {docs.length > 0 && (
            <div className="st-field">
              <label htmlFor={`st-mail-attach-${order.id}`}>Attach</label>
              <select id={`st-mail-attach-${order.id}`} value={attach} onChange={e => setAttach(e.target.value)}>
                <option value="">Nothing</option>
                {docs.map(d => <option key={d.id} value={d.id}>{d.number} (PDF)</option>)}
              </select>
            </div>
          )}
          <div className="st-business-actions">
            <button type="submit" className="st-btn st-btn-primary" disabled={state === 'sending' || !subject.trim() || !body.trim()}>
              {state === 'sending' ? 'Sending' : `Send to ${first}`}
            </button>
            <span className="st-hint">From your Gmail to {c.email}</span>
          </div>
        </form>
      )}
      <p role="status" className="st-save-state">{state !== 'sending' && state}</p>
    </section>
  );
}
