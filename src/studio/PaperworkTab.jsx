import React, { useState, useEffect } from 'react';
import { getUkTaxYear } from '../data/catalogData.js';
import { statusInfo, parseEventDate, money, orderTotal } from './studioFormat';

const DRIVE_LINKS = [
  ['businessFolder', 'Business folder', 'Everything below lives here'],
  ['moneyInOut', 'Money in and out', 'Every payment and cost, ready for your tax return'],
  ['quotes', 'Quotes', 'Filed by tax year'],
  ['invoices', 'Invoices', 'Filed by tax year'],
  ['receipts', 'Receipts', 'Photos of receipts for balloons, helium and supplies'],
  ['productPhotos', 'Product photos', 'Pictures for the website'],
  ['eventPhotos', 'Finished events', 'Your best work, for new looks'],
  ['masterSheet', 'Orders sheet', 'Every enquiry and booking']
];

// UK tax year an event falls in, e.g. 2026-11-14 -> "2026/27"
function taxYearOf(date) {
  const startYear = date.getMonth() > 3 || (date.getMonth() === 3 && date.getDate() >= 6) ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}/${String(startYear + 1).slice(2)}`;
}

function csvCell(value) {
  const text = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function PaperworkTab({ quotes, studioSettings, onSaveStudioSettings, onFetchDriveLinks }) {
  const [drive, setDrive] = useState({ state: 'loading', links: null });
  const [conn, setConn] = useState({
    webAppUrl: studioSettings?.sheetConfig?.webAppUrl || '',
    adminSecret: studioSettings?.sheetConfig?.adminSecret || ''
  });
  const [connState, setConnState] = useState('idle');
  const [copied, setCopied] = useState('');
  const taxYear = getUkTaxYear().slash;

  const loadLinks = () => {
    if (!onFetchDriveLinks) { setDrive({ state: 'not-connected', links: null }); return; }
    setDrive({ state: 'loading', links: null });
    onFetchDriveLinks()
      .then(res => setDrive({ state: res.connected ? (res.links ? 'ready' : 'not-set-up') : 'not-connected', links: res.links }))
      .catch(() => setDrive({ state: 'error', links: null }));
  };
  useEffect(loadLinks, []);

  const copyScript = async () => {
    try {
      const { default: text } = await import('../../GoogleAppsScript.gs?raw');
      await navigator.clipboard.writeText(text);
      setCopied('Copied. Paste it into Apps Script.');
    } catch (_e) {
      setCopied("Couldn't copy here. Ask Oliver for the GoogleAppsScript.gs file.");
    }
  };

  const saveConnection = async (e) => {
    e.preventDefault();
    if (!onSaveStudioSettings) return;
    setConnState('saving');
    try {
      await onSaveStudioSettings({ ...studioSettings, sheetConfig: { webAppUrl: conn.webAppUrl.trim(), adminSecret: conn.adminSecret.trim() } });
      setConnState('saved');
      loadLinks();
    } catch (_e) {
      setConnState('error');
    }
  };

  // This tax year's bookings that have taken money, by event date
  const yearOrders = quotes.filter(q => {
    const date = parseEventDate(q.client?.eventDate);
    const tone = statusInfo(q.status).tone;
    return date && taxYearOf(date) === taxYear && (tone === 'deposit' || tone === 'confirmed' || tone === 'done');
  });
  const received = yearOrders.reduce((sum, q) => {
    const tone = statusInfo(q.status).tone;
    return sum + (tone === 'done' ? orderTotal(q) : Number(q.configuration?.depositPaid) || 0);
  }, 0);

  const downloadIncome = () => {
    const rows = [['Event date', 'Order ref', 'Customer', 'Status', 'Total (£)', 'Deposit received (£)', 'Received in full']];
    yearOrders.forEach(q => {
      const tone = statusInfo(q.status).tone;
      rows.push([q.client?.eventDate, q.id, q.client?.name, statusInfo(q.status).label, orderTotal(q), Number(q.configuration?.depositPaid) || 0, tone === 'done' ? 'Yes' : 'No']);
    });
    const blob = new Blob([rows.map(r => r.map(csvCell).join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `occasion-edit-income-${taxYear.replace('/', '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="st-catalogue">
      <section className="st-palettes" aria-labelledby="st-drive-title">
        <h3 id="st-drive-title" className="st-section-title">Your Google Drive</h3>

        {drive.state === 'loading' && <p className="st-cat-note">Checking your Google Drive…</p>}

        {drive.state === 'ready' && (
          <ul className="st-drive-grid">
            {DRIVE_LINKS.filter(([key]) => drive.links[key]).map(([key, title, note]) => (
              <li key={key}>
                <a className="st-drive-link" href={drive.links[key]} target="_blank" rel="noopener noreferrer">
                  <strong>{title}</strong>
                  <span>{note}</span>
                </a>
              </li>
            ))}
          </ul>
        )}

        {drive.state === 'error' && (
          <p className="st-warning">Your Google Sheet didn't answer just now. Check the web app address below, or try again later.</p>
        )}

        {(drive.state === 'not-connected' || drive.state === 'not-set-up' || drive.state === 'error') && (
          <>
            <p className="st-cat-note">
              Do this once. It builds your business folders and a Money In &amp; Out record in your own Google Drive,
              then links them here so every quote, invoice, receipt and photo has a home.
            </p>
            <ol className="st-setup-steps">
              <li>
                Open a new Google Sheet at <a href="https://sheets.new" target="_blank" rel="noopener noreferrer">sheets.new</a> and
                call it "THE Occasion Edit — Studio Master Sheet".
              </li>
              <li>
                Choose <strong>Extensions</strong>, then <strong>Apps Script</strong>. Delete what's there and paste the setup script.
                <div className="st-business-actions">
                  <button type="button" className="st-btn" onClick={copyScript}>Copy the setup script</button>
                  <span role="status" className="st-save-state">{copied}</span>
                </div>
              </li>
              <li>
                Pick <strong>setUpMyDrive</strong> next to Run, press <strong>Run</strong> and allow access. Your folders appear in Drive.
              </li>
              <li>
                Choose <strong>Deploy</strong>, then <strong>New deployment</strong>, then <strong>Web app</strong> (execute as you, anyone can access).
                Paste the web app address and the secret from the log here:
              </li>
            </ol>
            <form className="st-fieldset" onSubmit={saveConnection}>
              <div className="st-field">
                <label htmlFor="st-sheet-url">Web app address</label>
                <input id="st-sheet-url" type="text" inputMode="url" placeholder="https://script.google.com/macros/s/…" value={conn.webAppUrl} onChange={e => setConn({ ...conn, webAppUrl: e.target.value })} />
              </div>
              <div className="st-field">
                <label htmlFor="st-sheet-secret">Secret</label>
                <input id="st-sheet-secret" type="text" autoComplete="off" value={conn.adminSecret} onChange={e => setConn({ ...conn, adminSecret: e.target.value })} />
              </div>
              <div className="st-business-actions">
                <button type="submit" className="st-btn st-btn-primary" disabled={!conn.webAppUrl || !conn.adminSecret || connState === 'saving'}>
                  {connState === 'saving' ? 'Connecting' : 'Connect my Google Drive'}
                </button>
                <span role="status" className="st-save-state">
                  {connState === 'saved' && 'Connected.'}
                  {connState === 'error' && 'Not saved. Check your connection and try again.'}
                </span>
              </div>
            </form>
          </>
        )}
      </section>

      <section className="st-palettes" aria-labelledby="st-tax-title">
        <h3 id="st-tax-title" className="st-section-title">Tax</h3>
        <div className="st-fieldset">
          <p>
            <strong>Tax return:</strong> as a self-employed sole trader you file a Self Assessment return every year.
            For this tax year ({taxYear}) it's due online by 31 January {Number(taxYear.slice(0, 4)) + 2}.
            If you were trading before 6 April {taxYear.slice(0, 4)}, last year's return is due by 31 January {Number(taxYear.slice(0, 4)) + 1}.
          </p>
          <p>
            <strong>Making Tax Digital:</strong> with takings under £20,000 a year it doesn't apply to you yet.
            It reaches sole traders taking over £20,000 from April 2028.
          </p>
          <p>
            <strong>Tip:</strong> run business money through its own account. A free business account such as Monzo Business
            keeps it separate and includes an HMRC-recognised tax tool.
          </p>
        </div>
        <div className="st-business-actions">
          <button type="button" className="st-btn st-btn-primary" onClick={downloadIncome} disabled={yearOrders.length === 0}>
            Download this year's income
          </button>
          <span className="st-save-state">
            {yearOrders.length === 0 ? `No paid bookings in ${taxYear} yet.` : `${yearOrders.length} paid booking${yearOrders.length === 1 ? '' : 's'}, ${money(received)} received in ${taxYear}.`}
          </span>
        </div>
      </section>
    </div>
  );
}
