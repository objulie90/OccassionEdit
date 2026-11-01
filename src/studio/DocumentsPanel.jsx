import React, { useState, useRef, useEffect } from 'react';
import { buildDocument, defaultLines } from './documents';
import { money } from './studioFormat';

const A4_WIDTH = 794; // 210mm at 96dpi
const A4_HEIGHT = 1123;

// An A4 page shrunk to fit the panel, so Laura sees exactly what the customer gets
function A4Preview({ html, src, title }) {
  const box = useRef(null);
  const [scale, setScale] = useState(0.6);
  useEffect(() => {
    if (!box.current) return undefined;
    const measure = () => setScale(Math.min(1, box.current.clientWidth / A4_WIDTH));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="st-a4" style={{ height: A4_HEIGHT * scale }}>
      <iframe
        title={title}
        className="st-a4-frame"
        style={{ width: A4_WIDTH, height: A4_HEIGHT, transform: `scale(${scale})` }}
        {...(src ? { src } : { srcDoc: html })}
      />
    </div>
  );
}

const STATUS = { issued: 'Issued', replaced: 'Replaced by a newer version', paid: 'Paid', void: 'Void' };

/**
 * Quotes and invoices for one order. Issued documents are kept exactly as sent:
 * a quote can be reissued as a new version, an invoice can only be voided with a reason.
 */
export function DocumentsPanel({ order, steps, digitOptions, balloonColours, curatedPalettes = [], settings, onIssue, onAction, documentSource }) {
  const docs = order.documents || [];
  const [writing, setWriting] = useState(null); // 'quote' | 'invoice'
  const [viewing, setViewing] = useState(null); // doc id
  const [lines, setLines] = useState([]);
  const [notes, setNotes] = useState('');
  const [state, setState] = useState('');
  const [voiding, setVoiding] = useState(null);
  const [reason, setReason] = useState('');

  const activeInvoice = docs.find(d => d.kind === 'invoice' && d.status !== 'void');
  const latestQuote = [...docs].reverse().find(d => d.kind === 'quote' && d.status !== 'void');
  const cfg = order.configuration || {};

  const start = (kind) => {
    const from = kind === 'invoice' && latestQuote?.lines?.length ? latestQuote.lines : defaultLines(order, steps, digitOptions, balloonColours, curatedPalettes);
    setLines(from.map(l => ({ description: l.description, amount: l.amount ?? '' })));
    setNotes('');
    setWriting(kind);
    setViewing(null);
    setState('');
  };

  const draft = writing ? buildDocument(writing, order, {
    lines,
    notes,
    settings,
    version: docs.filter(d => d.kind === writing).length + 1,
    depositPaid: cfg.depositPaid,
    balancePaid: cfg.balancePaid
  }) : null;

  const issue = async () => {
    if (!draft) return;
    if (!lines.some(l => String(l.description).trim())) { setState('Add at least one line.'); return; }
    setState('saving');
    try {
      const res = await onIssue(order.id, {
        kind: writing,
        html: draft.html,
        total: draft.total,
        notes,
        lines: lines.filter(l => String(l.description).trim()).map(l => ({ description: l.description, amount: l.amount === '' ? null : Number(l.amount) }))
      });
      setWriting(null);
      setViewing(res.document.id);
      setState(res.drive?.ok ? `${res.document.number} saved and filed in Google Drive.` : `${res.document.number} saved and kept on record.${res.drive?.error ? ` Not in Google Drive yet: ${res.drive.error}` : ''}`);
    } catch (err) {
      setState(err.message || 'Not saved. Check your connection and try again.');
    }
  };

  const act = async (doc, what, body) => {
    setState('saving');
    try {
      const res = await onAction(doc.id, what, body);
      setVoiding(null);
      setReason('');
      setState(what === 'void' ? `${doc.number} is void. Write a new invoice if one is needed.` : what === 'paid' ? `${doc.number} marked paid.` : res.drive?.ok ? 'Filed in Google Drive.' : `Not filed: ${res.drive?.error || 'Google Drive isn’t connected yet.'}`);
    } catch (err) {
      setState(err.message || 'Not saved. Check your connection and try again.');
    }
  };

  const viewed = docs.find(d => d.id === viewing);

  return (
    <section className="st-panel st-panel-wide" aria-labelledby="st-docs">
      <h4 id="st-docs" className="st-panel-title">Quotes and invoices</h4>

      {docs.length > 0 && (
        <ul className="st-docs">
          {[...docs].reverse().map(d => (
            <li key={d.id} className={`st-doc is-${d.status}`}>
              <span className="st-doc-main">
                <strong>{d.number}</strong>
                <span className="st-today-sub">{new Date(d.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {money(d.total)} · {STATUS[d.status] || d.status}{d.voidReason ? ` (${d.voidReason})` : ''}</span>
              </span>
              <span className="st-doc-actions">
                <button type="button" className="st-btn" onClick={() => { setViewing(viewing === d.id ? null : d.id); setWriting(null); }}>{viewing === d.id ? 'Hide' : 'View'}</button>
                {d.driveUrl
                  ? <a className="st-btn" href={d.driveUrl} target="_blank" rel="noopener noreferrer">In Google Drive</a>
                  : d.status !== 'void' && <button type="button" className="st-btn" onClick={() => act(d, 'file')}>File in Google Drive</button>}
                {d.kind === 'invoice' && d.status === 'issued' && <button type="button" className="st-btn" onClick={() => act(d, 'paid')}>Mark paid</button>}
                {d.kind === 'invoice' && d.status !== 'void' && <button type="button" className="st-link st-link-danger" onClick={() => setVoiding(d.id)}>Void</button>}
              </span>
              {voiding === d.id && (
                <form className="st-deposit-row st-void" onSubmit={e => { e.preventDefault(); if (reason.trim()) act(d, 'void', { reason: reason.trim() }); }}>
                  <label htmlFor={`st-void-${d.id}`} className="st-visually-hidden">Why is it being voided?</label>
                  <input id={`st-void-${d.id}`} type="text" placeholder="Why, for your records" value={reason} onChange={e => setReason(e.target.value)} />
                  <button type="submit" className="st-btn st-btn-primary" disabled={!reason.trim()}>Void invoice</button>
                  <button type="button" className="st-link st-link-quiet" onClick={() => setVoiding(null)}>Cancel</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {!writing && (
        <div className="st-business-actions">
          <button type="button" className="st-btn st-btn-primary" onClick={() => start('quote')}>{latestQuote ? 'Write a new version of the quote' : 'Write the quote'}</button>
          {!activeInvoice && <button type="button" className="st-btn" onClick={() => start('invoice')}>Write the invoice</button>}
          <span role="status" className="st-save-state">{state !== 'saving' && state}</span>
        </div>
      )}

      {writing && draft && (
        <div className="st-doc-writer">
          <div className="st-doc-fields">
            <p className="st-field-label">{draft.number}</p>
            <div className="st-doc-lines" role="table" aria-label="Lines">
              {lines.map((l, i) => (
                <div role="row" key={i} className="st-doc-line">
                  <input type="text" aria-label={`Line ${i + 1}`} value={l.description} onChange={e => setLines(lines.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
                  <input type="number" inputMode="decimal" min="0" aria-label={`Line ${i + 1} price (£)`} placeholder="To confirm" value={l.amount} onChange={e => setLines(lines.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
                  <button type="button" className="st-link st-link-quiet" aria-label={`Remove line ${i + 1}`} onClick={() => setLines(lines.filter((_, j) => j !== i))}>Remove</button>
                </div>
              ))}
            </div>
            <button type="button" className="st-link" onClick={() => setLines([...lines, { description: '', amount: '' }])}>Add a line</button>
            <div className="st-field">
              <label htmlFor={`st-doc-notes-${order.id}`}>A note for the customer (optional)</label>
              <textarea id={`st-doc-notes-${order.id}`} rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <p className="st-hint">
              Total {money(draft.total)}{writing === 'quote' ? `, deposit ${money(draft.deposit)}` : `, balance due ${money(draft.due)}`}.
              {writing === 'invoice' ? ' Once issued, an invoice is kept exactly as it is for your tax records.' : ''}
            </p>
            <div className="st-business-actions">
              <button type="button" className="st-btn st-btn-primary" disabled={state === 'saving'} onClick={issue}>{state === 'saving' ? 'Saving' : writing === 'invoice' ? 'Issue invoice' : 'Issue quote'}</button>
              <button type="button" className="st-link st-link-quiet" onClick={() => setWriting(null)}>Cancel</button>
              <span role="status" className="st-save-state">{state !== 'saving' && state}</span>
            </div>
          </div>
          <A4Preview html={draft.html} title={`Preview of ${draft.number}`} />
        </div>
      )}

      {viewed && !writing && (
        <div className="st-doc-view">
          <A4Preview {...documentSource(viewed)} title={viewed.number} />
          {viewed.driveFileId && (
            <iframe className="st-a4-drive" title={`${viewed.number} in Google Drive`} src={`https://drive.google.com/file/d/${viewed.driveFileId}/preview`} />
          )}
        </div>
      )}
    </section>
  );
}
