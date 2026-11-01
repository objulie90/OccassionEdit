import React, { useState, useEffect, useRef } from 'react';
import { getDeliveryZoneForMileage } from '../data/catalogData.js';
import { milesFromBase } from '../lib/places';
import { BOOKING_TERMS, depositFor } from '../lib/terms';
import { BalloonGraphic } from '../components/ui';
import { DossierVisualArtwork, WorkshopBalloonPullList, buildDossierOrderLines } from './OrderDossierParts';
import { DateTicket } from './DateTicket';
import { SendMessage } from './SendMessage';
import { balanceDueDate } from './messages';
import {
  ORDER_STATUSES,
  statusInfo,
  parseEventDate,
  sameDay,
  formatLongDate,
  describeDaysUntil,
  money,
  orderTotal,
  whatsappNumber
} from './studioFormat';

const PIPELINE = ORDER_STATUSES.filter(s => s.tone !== 'cancelled');

function historyTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function OrderDetail({
  order,
  allOrders,
  onBack,
  onSelectOrder,
  onUpdateOrder,
  onDeleteQuote,
  studioSettings = {},
  steps,
  digitOptions,
  balloonColours,
  deliveryConfig,
  flashToast
}) {
  const c = order.client || {};
  const cfg = order.configuration || {};
  const status = statusInfo(order.status);
  const total = orderTotal(order);
  const deposit = Number(cfg.depositPaid) || 0;
  const balancePaid = Number(cfg.balancePaid) || 0;
  const paid = deposit + balancePaid;
  const guidePrice = Number(cfg.estimatedTotal ?? cfg.subtotal ?? 0);
  const [composer, setComposer] = useState(null); // 'quote' | 'invoice'
  const [otherAmount, setOtherAmount] = useState(null); // typing a deposit that isn't the usual half
  const [undo, setUndo] = useState(null); // { message, snapshot, label }
  const [notes, setNotes] = useState(c.staffNotes || '');
  const [notesState, setNotesState] = useState('idle');
  const undoTimer = useRef(null);
  useEffect(() => () => clearTimeout(undoTimer.current), []);

  const date = parseEventDate(c.eventDate);
  const lines = buildDossierOrderLines(cfg, steps, digitOptions);
  const hireLines = lines.filter(l => l.hire);
  const garland = steps.flatMap(st => st.items || []).find(it => it.id === cfg.balloonId) || null;
  const colours = (cfg.palette || []).map(name =>
    balloonColours.find(b => b.name === name) || { id: name, name, hex: '#D8D2C8' }
  );

  const sameDayOrders = date
    ? allOrders.filter(o => o.id !== order.id
        && statusInfo(o.status).tone !== 'cancelled'
        && sameDay(parseEventDate(o.client?.eventDate), date))
    : [];

  const miles = milesFromBase(c.postcode || c.area);
  const zone = miles != null ? getDeliveryZoneForMileage(Math.round(miles * 10) / 10, deliveryConfig.zones) : null;
  const mapsQuery = [c.venueName, c.postcode || c.area].filter(Boolean).join(', ');
  const wa = whatsappNumber(c.phone);

  const depositAsk = depositFor(total);
  const balanceDue = balanceDueDate(c.eventDate);
  const collectDate = date ? new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1) : null;

  // Every action records a line in the order's history and can be undone for a few seconds
  const act = async (patch, historyText, message) => {
    const snapshot = { status: order.status || 'New Enquiry', depositPaid: deposit, balancePaid, quotedPrice: cfg.quotedPrice ?? '' };
    setComposer(null);
    setOtherAmount(null);
    const ok = await onUpdateOrder(order.id, patch, historyText);
    if (ok === false) return;
    clearTimeout(undoTimer.current);
    setUndo({ message, snapshot, label: status.label });
    undoTimer.current = setTimeout(() => setUndo(null), 10000);
  };

  const undoLast = () => {
    if (!undo) return;
    clearTimeout(undoTimer.current);
    onUpdateOrder(order.id, undo.snapshot, `Changed back to ${undo.label.toLowerCase()}`);
    setUndo(null);
  };

  const quoteSent = (channel, price) => act(
    { status: status.tone === 'new' ? 'Quote Sent' : order.status, quotedPrice: price },
    `Quote of ${money(price)} sent by ${channel}`,
    'Quote marked as sent'
  );
  const invoiceSent = (channel) => act({}, `Balance invoice for ${money(Math.max(0, total - paid))} sent by ${channel}`, 'Invoice marked as sent');
  const depositIn = (amount) => act(
    { status: 'Deposit Paid', depositPaid: amount },
    `Deposit ${money(amount)} received`,
    `Deposit of ${money(amount)} recorded. ${c.name || 'This order'} is booked`
  );
  const balanceIn = () => act(
    { status: 'Confirmed', balancePaid: Math.max(0, total - deposit) },
    `Balance ${money(Math.max(0, total - deposit))} received`,
    'Balance recorded. Paid in full'
  );
  const markDone = () => act({ status: 'Completed' }, 'Marked as done', 'Marked as done');
  const cancel = () => act({ status: 'Cancelled' }, 'Booking cancelled', 'Booking cancelled and the date freed up');
  const reopen = () => act({ status: 'New Enquiry' }, 'Reopened as a new enquiry', 'Reopened');

  const saveNotes = async (e) => {
    e.preventDefault();
    setNotesState('saving');
    const ok = await onUpdateOrder(order.id, { staffNotes: notes.trim() });
    setNotesState(ok === false ? 'error' : 'saved');
  };

  const lineTitles = lines.map(l => l.title + (l.digits ? ` (${l.digits})` : ''));
  const history = [
    ...(order.addedByStaff ? [] : [{ at: order.createdAt, text: 'Enquiry received through the website' }]),
    ...(order.history || [])
  ].filter(h => h.at).reverse();

  return (
    <article className="st-detail">
      <button type="button" className="st-back" onClick={onBack}>Back to orders</button>

      <header className="st-detail-head">
        <DateTicket value={c.eventDate} size="large" />
        <div className="st-detail-title">
          <h3 className="st-detail-name">{c.name || 'Name not given'}</h3>
          <p className="st-detail-when">
            {date ? `${formatLongDate(date)}, ${describeDaysUntil(date).toLowerCase()}` : 'No event date given'}
          </p>
          <p className="st-detail-ref">Payment reference {order.id}</p>
        </div>
        <div className="st-contact">
          {c.phone && <a className="st-btn" href={`tel:${c.phone.replace(/\s+/g, '')}`}>Call</a>}
          {wa && <a className="st-btn" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
          {c.email && <a className="st-btn" href={`mailto:${c.email}`}>Email</a>}
        </div>
      </header>

      <section className="st-progress" aria-label="Where this order is up to">
        {status.tone === 'cancelled' ? (
          <div className="st-next">
            <p className="st-next-title">This booking was cancelled.</p>
            <div className="st-next-actions">
              <button type="button" className="st-btn" onClick={reopen}>Reopen as a new enquiry</button>
            </div>
          </div>
        ) : (
          <>
            <ol className="st-path" aria-label="Order steps">
              {PIPELINE.map((step, i) => {
                const at = PIPELINE.findIndex(x => x.id === status.id);
                return (
                  <li key={step.id} className={`st-path-step ${i < at ? 'is-done' : ''} ${i === at ? 'is-current' : ''}`} aria-current={i === at ? 'step' : undefined}>
                    {step.label}
                  </li>
                );
              })}
            </ol>

            {composer ? (
              <SendMessage
                kind={composer}
                order={order}
                lines={lineTitles}
                guidePrice={guidePrice}
                total={total}
                paid={paid}
                settings={studioSettings}
                onSent={composer === 'quote' ? quoteSent : invoiceSent}
                onCancel={() => setComposer(null)}
              />
            ) : (
              <div className="st-next">
                {status.tone === 'new' && (
                  <>
                    <p className="st-next-title">Next: send {c.name ? c.name.split(' ')[0] : 'them'} a quote</p>
                    <div className="st-next-actions">
                      <button type="button" className="st-btn st-btn-primary" onClick={() => setComposer('quote')}>Send quote</button>
                    </div>
                  </>
                )}
                {status.tone === 'quoted' && (
                  <>
                    <p className="st-next-title">Next: the deposit of {money(depositAsk)}</p>
                    <div className="st-next-actions">
                      <button type="button" className="st-btn st-btn-primary" onClick={() => depositIn(depositAsk)}>Deposit received: {money(depositAsk)}</button>
                      <button type="button" className="st-btn" onClick={() => setOtherAmount('')}>A different amount</button>
                      <button type="button" className="st-link st-link-quiet" onClick={() => setComposer('quote')}>Send the quote again</button>
                    </div>
                  </>
                )}
                {status.tone === 'deposit' && (
                  <>
                    <p className="st-next-title">
                      Next: the balance of {money(Math.max(0, total - paid))}{balanceDue ? `, due by ${formatLongDate(balanceDue)}` : ''}
                    </p>
                    <div className="st-next-actions">
                      <button type="button" className="st-btn st-btn-primary" onClick={() => setComposer('invoice')}>Send balance invoice</button>
                      <button type="button" className="st-btn" onClick={balanceIn}>Balance received: {money(Math.max(0, total - deposit))}</button>
                    </div>
                  </>
                )}
                {status.tone === 'confirmed' && (
                  <>
                    <p className="st-next-title">All paid. After the party, once the props are back:</p>
                    <div className="st-next-actions">
                      <button type="button" className="st-btn st-btn-primary" onClick={markDone}>Mark as done</button>
                    </div>
                  </>
                )}
                {status.tone === 'done' && (
                  <>
                    <p className="st-next-title">All done.</p>
                    <div className="st-next-actions">
                      <button type="button" className="st-link st-link-quiet" onClick={reopen}>Reopen</button>
                    </div>
                  </>
                )}
                {otherAmount !== null && (
                  <form className="st-deposit-row" onSubmit={e => { e.preventDefault(); const v = Math.max(0, parseFloat(otherAmount) || 0); if (v > 0) depositIn(v); }}>
                    <label htmlFor="st-other-deposit" className="st-visually-hidden">Deposit received (£)</label>
                    <input id="st-other-deposit" type="number" inputMode="decimal" min="0" step="0.01" placeholder="Amount (£)" value={otherAmount} onChange={e => setOtherAmount(e.target.value)} />
                    <button type="submit" className="st-btn st-btn-primary">Record deposit</button>
                    <button type="button" className="st-link st-link-quiet" onClick={() => setOtherAmount(null)}>Cancel</button>
                  </form>
                )}
                {status.tone !== 'done' && (
                  <button type="button" className="st-link st-link-quiet st-cancel-link" onClick={cancel}>Cancel booking</button>
                )}
              </div>
            )}
          </>
        )}
        {undo && (
          <div className="st-undo" role="status">
            <span>{undo.message}.</span>
            <button type="button" className="st-link" onClick={undoLast}>Undo</button>
          </div>
        )}
      </section>

      <div className="st-detail-grid">
        <section className="st-panel st-panel-wide" aria-labelledby="st-what">
          <h4 id="st-what" className="st-panel-title">What they asked for</h4>
          <div className="st-what">
            <div className="st-what-picture">
              <DossierVisualArtwork activeQuote={order} colours={colours} />
            </div>
            <div className="st-what-items">
              {lines.length === 0 && <p className="st-empty">No items recorded on this enquiry.</p>}
              <ul className="st-items">
                {lines.map(line => (
                  <li key={line.key} className="st-item">
                    <span className="st-item-title">{line.title}</span>
                    {line.digits && <span className="st-item-detail">Numbers or letters: <strong>{line.digits}</strong></span>}
                    {line.detail && <span className="st-item-detail">{line.detail}</span>}
                    {line.hire && <span className="st-tag">Hire, collect next day</span>}
                  </li>
                ))}
              </ul>
              {colours.length > 0 && (
                <div className="st-colours">
                  <span className="st-label">Colours</span>
                  <ul className="st-colour-list">
                    {colours.map(col => (
                      <li key={col.id}>
                        <BalloonGraphic hex={col.hex} finish={col.finish} size={22} />
                        <span>{col.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {c.notes && (
                <div className="st-notes">
                  <span className="st-label">Their notes</span>
                  <p>{c.notes}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="st-panel" aria-labelledby="st-where">
          <h4 id="st-where" className="st-panel-title">The day</h4>
          <dl className="st-facts">
            {c.source && <div><dt>Booked through</dt><dd>{c.source}</dd></div>}
            {c.occasion && <div><dt>Celebrating</dt><dd>{c.occasion}</dd></div>}
            {c.style && <div><dt>Style</dt><dd>{c.style}</dd></div>}
            <div><dt>Venue</dt><dd>{c.hasVenue === 'no' && !c.venueName ? 'Not booked yet' : (c.venueName || 'Not given')}{c.setting && c.hasVenue !== 'no' ? `, ${c.setting}` : ''}</dd></div>
            {c.hasVenue === 'no' && c.area && <div><dt>Hoping to be near</dt><dd>{c.area}</dd></div>}
            <div><dt>Postcode</dt><dd>{c.postcode || 'Not given yet'}</dd></div>
            <div><dt>Access from</dt><dd>{c.accessTime || 'Not given'}</dd></div>
            {miles != null && (
              <div><dt>Distance</dt><dd>About {Math.round(miles)} miles{zone?.zone ? `, ${zone.zone.name.toLowerCase()}${zone.perMile ? ' (mileage charge)' : ' (free)'}` : ', outside your 20 miles'}</dd></div>
            )}
            {hireLines.length > 0 && collectDate && (
              <div><dt>Collect props</dt><dd>{formatLongDate(collectDate)}</dd></div>
            )}
          </dl>
          {mapsQuery && (
            <a className="st-link" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapsQuery)}`} target="_blank" rel="noopener noreferrer">
              Directions in Google Maps
            </a>
          )}
          {sameDayOrders.length > 0 && (
            <div className="st-clash">
              <span className="st-label">Also booked that day</span>
              <ul>
                {sameDayOrders.map(o => (
                  <li key={o.id}>
                    <button type="button" className="st-link" onClick={() => onSelectOrder(o.id)}>
                      {o.client?.name || 'Name not given'}
                    </button>
                    {' '}({statusInfo(o.status).label.toLowerCase()})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="st-panel" aria-labelledby="st-money">
          <h4 id="st-money" className="st-panel-title">Money</h4>
          <dl className="st-facts">
            <div><dt>{cfg.quotedPrice != null && cfg.quotedPrice !== '' ? 'Price quoted' : 'Guide price'}</dt><dd className="st-strong">{money(total)}</dd></div>
            {Number(c.budget) > 0 && <div><dt>Their budget</dt><dd>{money(c.budget)}</dd></div>}
            {Number(cfg.bundleDiscount) > 0 && <div><dt>Discount included</dt><dd>{money(cfg.bundleDiscount)}{cfg.promoCode ? ` (code ${cfg.promoCode})` : ''}</dd></div>}
            <div><dt>Deposit ({BOOKING_TERMS.depositPercent}%)</dt><dd>{deposit > 0 ? `${money(deposit)} received` : `${money(depositAsk)} to ask for`}</dd></div>
            {balancePaid > 0 && <div><dt>Balance</dt><dd>{money(balancePaid)} received</dd></div>}
            <div><dt>Still to pay</dt><dd className="st-strong">{money(Math.max(0, total - paid))}</dd></div>
            {balanceDue && total - paid > 0 && <div><dt>Balance due by</dt><dd>{formatLongDate(balanceDue)}</dd></div>}
          </dl>
        </section>

        <section className="st-panel" aria-labelledby="st-notes">
          <h4 id="st-notes" className="st-panel-title">Your notes</h4>
          <form className="st-notes-form" onSubmit={saveNotes}>
            <label htmlFor={`st-notes-${order.id}`} className="st-visually-hidden">Your notes on this order</label>
            <textarea
              id={`st-notes-${order.id}`}
              rows={3}
              placeholder="Anything to remember, like what you agreed on WhatsApp"
              value={notes}
              onChange={e => { setNotes(e.target.value); setNotesState('idle'); }}
            />
            <div className="st-business-actions">
              <button type="submit" className="st-btn" disabled={notes.trim() === (c.staffNotes || '') || notesState === 'saving'}>Save notes</button>
              <span role="status" className="st-save-state">
                {notesState === 'saved' && 'Saved'}
                {notesState === 'error' && 'Not saved. Check your connection and try again.'}
              </span>
            </div>
          </form>
        </section>

        <section className="st-panel" aria-labelledby="st-history">
          <h4 id="st-history" className="st-panel-title">History</h4>
          <ol className="st-history">
            {history.map((h, i) => (
              <li key={`${h.at}-${i}`}>
                <span className="st-history-when">{historyTime(h.at)}</span>
                <span>{h.text}</span>
              </li>
            ))}
          </ol>
        </section>

        {garland && (
          <section className="st-panel st-panel-wide" aria-labelledby="st-balloons">
            <h4 id="st-balloons" className="st-panel-title">Balloons to prepare</h4>
            <WorkshopBalloonPullList garland={garland} colours={colours}/>
          </section>
        )}
      </div>

      {onDeleteQuote && (
        <footer className="st-detail-foot">
          <button type="button" className="st-link st-link-danger" onClick={() => onDeleteQuote(order.id, c.name || 'this customer')}>
            Delete this enquiry and the customer's details
          </button>
        </footer>
      )}
    </article>
  );
}
