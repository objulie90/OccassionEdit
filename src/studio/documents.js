// Quotes and invoices: an A4 page built from the order, in The Occasion Edit's
// style. The same HTML is shown in the Studio, kept on the server as the record
// of what was issued, and turned into a PDF in Laura's Google Drive.
import logo from '../assets/logoDataUri';
import { calculateLookRecipePrice } from '../data/catalogData.js';
import { BOOKING_TERMS, depositFor } from '../lib/terms';
import { parseEventDate, formatLongDate, money, orderTotal } from './studioFormat';
import { balanceDueDate } from './messages';

const QUOTE_VALID_DAYS = 14;

// The items on the order, priced as the builder priced them, for Laura to adjust
export function defaultLines(order, steps, digitOptions, balloonColours, curatedPalettes) {
  const cfg = order.configuration || {};
  const recipe = {
    backdropId: cfg.backdropId || null,
    balloonId: cfg.balloonId || null,
    shimmerSize: cfg.shimmerSize === 'large' ? 'large' : 'small',
    digitOptionId: cfg.digitId || 'digits-none',
    digitText: cfg.digitText || '',
    extraIds: cfg.extraIds || []
  };
  const calc = calculateLookRecipePrice(recipe, steps, digitOptions, balloonColours, curatedPalettes);
  const words = [];
  if (cfg.boardCustomization?.text) words.push(`wording "${cfg.boardCustomization.text}"`);
  if (cfg.neonPhrase) words.push(`neon "${cfg.neonPhrase}"`);
  if (cfg.bubbleText) words.push(`bubble "${cfg.bubbleText}"`);
  if (cfg.cutoutTheme) words.push(`cut-out theme: ${cfg.cutoutTheme}`);
  const lines = calc.lines.map(l => ({ description: l.label, amount: l.tbc ? '' : Number(l.amount) }));
  if (!lines.length) lines.push({ description: 'Your balloon styling, as discussed', amount: orderTotal(order) || '' });
  if (cfg.palette?.length) lines.push({ description: `Colours: ${cfg.palette.join(', ')}`, amount: 0 });
  if (words.length) lines.push({ description: `Personalised with ${words.join(', ')}`, amount: 0 });
  return lines;
}

const esc = v => String(v ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const pounds = v => money(Math.round((Number(v) || 0) * 100) / 100);

export function documentNumber(kind, orderId, version = 1) {
  return `${kind === 'invoice' ? 'INVOICE' : 'QUOTE'} ${orderId}${version > 1 ? ` v${version}` : ''}`;
}

export function documentFileName(kind, orderId, version = 1) {
  return `${documentNumber(kind, orderId, version).replace(/\//g, '-')}.pdf`;
}

/**
 * @param {'quote'|'invoice'} kind
 * @param {object} order
 * @param {{ lines, notes, settings, issuedOn, version, depositPaid, balancePaid }} opts
 */
export function buildDocument(kind, order, { lines, notes = '', settings = {}, issuedOn = new Date(), version = 1, depositPaid = 0, balancePaid = 0 }) {
  const c = order.client || {};
  const isInvoice = kind === 'invoice';
  const priced = lines.filter(l => String(l.description || '').trim());
  const total = priced.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const deposit = depositFor(total);
  const paid = (Number(depositPaid) || 0) + (Number(balancePaid) || 0);
  const due = Math.max(0, total - paid);
  const event = parseEventDate(c.eventDate);
  const balanceBy = balanceDueDate(c.eventDate);
  const validUntil = new Date(issuedOn.getFullYear(), issuedOn.getMonth(), issuedOn.getDate() + QUOTE_VALID_DAYS);
  const number = documentNumber(kind, order.id, version);
  const business = settings.businessTradingName || 'The Occasion Edit';
  const hasBank = settings.sortCode && settings.accountNumber;
  const unpriced = priced.some(l => l.amount === '' || l.amount == null);

  const rows = priced.map(l => `
        <tr><td>${esc(l.description)}</td><td class="amt">${l.amount === '' || l.amount == null ? 'To confirm' : Number(l.amount) ? pounds(l.amount) : 'Included'}</td></tr>`).join('');

  const terms = isInvoice
    ? `<p>${paid > 0 ? `Thank you for your payment of ${pounds(paid)}. ` : ''}The balance of <strong>${pounds(due)}</strong> is due by <strong>${balanceBy ? formatLongDate(balanceBy) : `${BOOKING_TERMS.balanceDaysBefore} days before your event`}</strong>.</p>`
    : `<p>A ${BOOKING_TERMS.depositPercent}% deposit of <strong>${pounds(deposit)}</strong> secures your date. The balance of <strong>${pounds(total - deposit)}</strong> is due ${balanceBy ? `by <strong>${formatLongDate(balanceBy)}</strong>, ` : ''}${BOOKING_TERMS.balanceDaysBefore} days before your event.</p>
       <p>This quote is valid until ${formatLongDate(validUntil)}. Hire items (backdrops, walls, signs and props) are collected the day after your event; balloon displays and numbers are yours to keep.</p>`;

  const html = `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><title>${esc(number)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Montserrat', Helvetica, Arial, sans-serif; font-size: 10.5pt; color: #1E211C; background: #FFFFFF; }
  .page { width: 210mm; min-height: 297mm; padding: 18mm 16mm; margin: 0 auto; background: #FFFFFF; }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12mm; padding-bottom: 8mm; border-bottom: 1.5pt solid #4A5840; }
  header img { width: 32mm; height: auto; }
  .from { text-align: right; font-size: 9pt; color: #4A4843; line-height: 1.5; }
  .from strong { display: block; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 15pt; color: #1E211C; }
  h1 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 26pt; font-weight: 600; margin: 9mm 0 1mm; color: #4A5840; }
  .number { font-size: 11pt; font-weight: 700; margin: 0 0 7mm; }
  .meta { display: flex; justify-content: space-between; gap: 10mm; font-size: 9.5pt; line-height: 1.55; margin-bottom: 8mm; }
  .meta h2 { font-size: 8.5pt; font-weight: 700; color: #6B675F; margin: 0 0 1mm; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6mm; }
  th { text-align: left; font-size: 8.5pt; color: #6B675F; font-weight: 700; padding: 2mm 0; border-bottom: 0.75pt solid #D9D2C5; }
  td { padding: 2.6mm 0; border-bottom: 0.5pt solid #ECE6DA; vertical-align: top; }
  .amt { text-align: right; white-space: nowrap; width: 32mm; }
  tfoot td { border: 0; padding-top: 2mm; }
  tfoot .label { text-align: right; padding-right: 6mm; color: #4A4843; }
  tfoot .grand td { font-size: 13pt; font-weight: 700; border-top: 1.2pt solid #1E211C; padding-top: 3mm; }
  .terms { background: #F7F3EA; border-radius: 3mm; padding: 5mm 6mm; line-height: 1.55; font-size: 9.5pt; }
  .terms p { margin: 0 0 2mm; }
  .pay { margin-top: 5mm; font-size: 9.5pt; line-height: 1.6; }
  .pay h2 { font-size: 8.5pt; font-weight: 700; color: #6B675F; margin: 0 0 1mm; }
  .thanks { margin-top: 9mm; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 14pt; color: #4A5840; }
  .notes { margin-top: 5mm; font-size: 9.5pt; white-space: pre-wrap; }
  footer { margin-top: 12mm; padding-top: 4mm; border-top: 0.5pt solid #D9D2C5; font-size: 8pt; color: #6B675F; text-align: center; }
</style></head>
<body><div class="page">
  <header>
    <img src="${logo}" alt="${esc(business)}">
    <div class="from">
      <strong>${esc(business)}</strong>
      ${[settings.studioAddress, settings.studioPhone, settings.studioEmail].filter(Boolean).map(esc).join('<br>')}
    </div>
  </header>

  <h1>${isInvoice ? 'Invoice' : 'Quote'}</h1>
  <p class="number">${esc(number)}</p>

  <div class="meta">
    <div>
      <h2>${isInvoice ? 'Billed to' : 'Prepared for'}</h2>
      ${esc(c.name || 'Customer')}<br>
      ${[c.email, c.phone].filter(Boolean).map(esc).join('<br>')}
    </div>
    <div>
      <h2>Your celebration</h2>
      ${esc(c.occasion || 'Celebration')}${event ? `, ${esc(formatLongDate(event))}` : ''}<br>
      ${esc([c.venueName, c.postcode || c.area].filter(Boolean).join(', '))}
    </div>
    <div>
      <h2>${isInvoice ? 'Invoice date' : 'Quote date'}</h2>
      ${esc(formatLongDate(issuedOn))}
    </div>
  </div>

  <table>
    <thead><tr><th>What we'll create for you</th><th class="amt">Price</th></tr></thead>
    <tbody>${rows}
    </tbody>
    <tfoot>
      <tr class="grand"><td class="label">Total${unpriced ? ' (items to confirm not included)' : ''}</td><td class="amt">${pounds(total)}</td></tr>
      ${isInvoice && paid > 0 ? `<tr><td class="label">Paid so far</td><td class="amt">-${pounds(paid)}</td></tr><tr><td class="label"><strong>Balance due</strong></td><td class="amt"><strong>${pounds(due)}</strong></td></tr>` : ''}
      ${!isInvoice ? `<tr><td class="label">Deposit to secure your date (${BOOKING_TERMS.depositPercent}%)</td><td class="amt">${pounds(deposit)}</td></tr>` : ''}
    </tfoot>
  </table>

  <div class="terms">${terms}</div>

  <div class="pay">
    <h2>How to pay</h2>
    ${hasBank
      ? `Bank transfer to ${esc(settings.accountName || business)}<br>Sort code ${esc(settings.sortCode)}, account ${esc(settings.accountNumber)}${settings.bankName ? `, ${esc(settings.bankName)}` : ''}<br>Please use <strong>${esc(order.id)}</strong> as your reference.`
      : `Please use <strong>${esc(order.id)}</strong> as your payment reference. Our bank details will follow.`}
  </div>

  ${notes ? `<p class="notes">${esc(notes)}</p>` : ''}

  <p class="thanks">${isInvoice ? 'Thank you so much for booking with us. We can\'t wait to bring your celebration to life.' : 'Thank you for thinking of us. We\'d love to make your celebration really special.'}</p>
  ${settings.signOffName ? `<p>${esc(settings.signOffName)}<br>${esc(business)}</p>` : ''}

  <footer>${esc(business)}${settings.studioAddress ? ` · ${esc(settings.studioAddress)}` : ''} · ${esc(number)}</footer>
</div></body></html>`;

  return { html, number, total, deposit, due, unpriced };
}
