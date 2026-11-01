import React, { useState } from 'react';
import { getUkTaxYear } from '../data/catalogData.js';
import { statusInfo, parseEventDate, money, orderTotal } from './studioFormat';

const DRIVE_LINKS = [
  ['businessFolder', 'Business folder', 'Everything below lives here'],
  ['moneyInOut', 'Income and expenses', 'Every payment and cost, ready for your tax return'],
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

export function PaperworkTab({ quotes, google }) {
  const taxYear = getUkTaxYear().slash;

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
      <GoogleConnection google={google} />

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

/**
 * Laura's Google account paired with the site, in one sign-in: her paperwork
 * files itself in Drive and customer emails show on each order.
 */
function GoogleConnection({ google }) {
  const st = google?.status || {};
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [confirmOff, setConfirmOff] = useState(false);
  const [keys, setKeys] = useState({ id: '', secret: '' });
  const [copied, setCopied] = useState(false);

  const run = async (what, fn) => {
    setBusy(what);
    setError('');
    try { await fn(); } catch (e) { setError(e.message); }
    setBusy('');
  };

  return (
    <section className="st-palettes" aria-labelledby="st-drive-title">
      <h3 id="st-drive-title" className="st-section-title">Your Google account</h3>

      {st.loading && <p className="st-cat-note">Checking your Google connection…</p>}

      {st.connected && (
        <>
          <p className="st-cat-note">
            Connected to {st.email}. New enquiries, payments, quotes and invoices go into your master sheet by themselves,
            and every email with a customer shows on their order.
            {st.demo && ' This preview opens a demo master sheet filled with example orders.'}
          </p>
          {st.links && (
            <ul className="st-drive-grid">
              {DRIVE_LINKS.filter(([key]) => st.links[key]).map(([key, title, note]) => (
                <li key={key}>
                  <a className="st-drive-link" href={st.links[key]} target="_blank" rel="noopener noreferrer">
                    <strong>{title}</strong>
                    <span>{note}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          {!st.gmail && (
            <div className="st-callout">
              <p>Connect again to add Gmail, so you can email customers from their orders.</p>
              <button type="button" className="st-btn st-btn-primary" onClick={() => run('connect', google.connect)}>Connect again</button>
            </div>
          )}
          {!st.demo && (
            confirmOff ? (
              <div className="st-business-actions">
                <span>Your folders and sheet stay in your Drive. The site just stops using them.</span>
                <button type="button" className="st-btn" onClick={() => run('off', google.disconnect)}>Disconnect</button>
                <button type="button" className="st-link st-link-quiet" onClick={() => setConfirmOff(false)}>Keep connected</button>
              </div>
            ) : (
              <button type="button" className="st-link st-link-quiet" onClick={() => setConfirmOff(true)}>Disconnect Google</button>
            )
          )}
        </>
      )}

      {!st.loading && !st.connected && st.available && (
        <div className="st-connect">
          <p>
            Sign in with Google once. The site then builds your business folders and master sheet in your Drive,
            files every quote and invoice there, and lets you email customers from their orders.
          </p>
          <button type="button" className="st-btn st-btn-primary st-btn-large" disabled={busy === 'connect'} onClick={() => run('connect', google.connect)}>
            {busy === 'connect' ? 'Opening Google' : 'Connect my Google account'}
          </button>
          <p className="st-hint">
            Google will ask you to allow three things: keeping the site's own files in your Drive, sending emails as you,
            and reading emails so customer conversations appear on their orders. It can't see your other files.
            If Google says it hasn't checked the app, that's because it's your own site: choose Advanced, then carry on.
          </p>
        </div>
      )}

      {!st.loading && !st.connected && !st.available && (
        <>
          <p className="st-cat-note">Oliver needs to switch Google sign-in on once. After that, it's one button for you.</p>
          <details className="st-oliver">
            <summary>For Oliver: switch on Google sign-in</summary>
            <ol className="st-setup-steps">
              <li>Follow GOOGLE-SETUP.md in the project to make a Google client ID and secret (about ten minutes).</li>
              <li>
                When Google asks for the redirect address, give it this:
                <div className="st-business-actions">
                  <code className="st-code-box">{st.redirectUri || 'Open this page on the live site to see it'}</code>
                  {st.redirectUri && (
                    <button type="button" className="st-btn" onClick={async () => { try { await navigator.clipboard.writeText(st.redirectUri); setCopied(true); } catch (_e) { setCopied(false); } }}>
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>
              </li>
              <li>Paste the client ID and secret here:</li>
            </ol>
            <form className="st-fieldset" onSubmit={e => { e.preventDefault(); run('keys', () => google.saveClient(keys.id.trim(), keys.secret.trim())); }}>
              <div className="st-field">
                <label htmlFor="st-g-id">Client ID</label>
                <input id="st-g-id" type="text" autoComplete="off" placeholder="…apps.googleusercontent.com" value={keys.id} onChange={e => setKeys({ ...keys, id: e.target.value })} />
              </div>
              <div className="st-field">
                <label htmlFor="st-g-secret">Client secret</label>
                <input id="st-g-secret" type="password" autoComplete="off" value={keys.secret} onChange={e => setKeys({ ...keys, secret: e.target.value })} />
              </div>
              <button type="submit" className="st-btn st-btn-primary" disabled={!keys.id || !keys.secret || busy === 'keys'}>{busy === 'keys' ? 'Saving' : 'Switch on Google sign-in'}</button>
            </form>
          </details>
        </>
      )}

      {(error || st.error) && <p className="st-warning" role="alert">{error || st.error}</p>}
    </section>
  );
}
