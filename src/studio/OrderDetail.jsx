import React, { useState } from 'react';
import { calculateDistanceToBottesford, getDeliveryZoneForMileage } from '../data/catalogData.js';
import { BalloonGraphic } from '../components/ui';
import { DossierVisualArtwork, WorkshopBalloonPullList, buildDossierOrderLines } from './OrderDossierParts';
import { DateTicket } from './DateTicket';
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

export function OrderDetail({
  order,
  allOrders,
  onBack,
  onSelectOrder,
  onUpdateQuoteStatus,
  onDeleteQuote,
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
  const [depositInput, setDepositInput] = useState(deposit ? String(deposit) : '');

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

  const miles = calculateDistanceToBottesford(c.postcode);
  const zone = miles != null ? getDeliveryZoneForMileage(Math.round(miles * 10) / 10, deliveryConfig.zones) : null;
  const mapsQuery = [c.venueName, c.postcode].filter(Boolean).join(', ');
  const wa = whatsappNumber(c.phone);

  const setStatus = (next) => {
    onUpdateQuoteStatus(order.id, next.id, deposit);
    if (flashToast) flashToast(`${c.name || 'Order'} marked as ${next.label.toLowerCase()}`);
  };

  const saveDeposit = (e) => {
    e.preventDefault();
    const value = Math.max(0, parseFloat(depositInput) || 0);
    const nextStatus = value > 0 && status.tone === 'new' ? 'Deposit Paid' : order.status || 'New Enquiry';
    onUpdateQuoteStatus(order.id, nextStatus, value);
    if (flashToast) flashToast(`Deposit of ${money(value)} saved`);
  };

  const collectDate = date ? new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1) : null;

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

      <section className="st-progress" aria-label="Order progress">
        {status.tone === 'cancelled' ? (
          <div className="st-cancelled-note">
            <span className={`st-status st-status-cancelled`}>Cancelled</span>
            <button type="button" className="st-link" onClick={() => setStatus(ORDER_STATUSES[0])}>Reopen as a new enquiry</button>
          </div>
        ) : (
          <>
            <ol className="st-steps">
              {PIPELINE.map((step, i) => {
                const reached = PIPELINE.findIndex(s => s.id === status.id) >= i;
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      className={`st-step ${reached ? 'is-reached' : ''} ${step.id === status.id ? 'is-current' : ''}`}
                      aria-current={step.id === status.id ? 'step' : undefined}
                      onClick={() => step.id !== status.id && setStatus(step)}
                    >
                      {step.label}
                    </button>
                  </li>
                );
              })}
            </ol>
            <button type="button" className="st-link st-link-quiet" onClick={() => setStatus(ORDER_STATUSES[4])}>Cancel booking</button>
          </>
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
            <div><dt>Venue</dt><dd>{c.venueName || 'Not given'}{c.setting ? `, ${c.setting}` : ''}</dd></div>
            <div><dt>Postcode</dt><dd>{c.postcode || 'Not given'}</dd></div>
            <div><dt>Access from</dt><dd>{c.accessTime || 'Not given'}</dd></div>
            {miles != null && (
              <div><dt>Distance</dt><dd>About {Math.round(miles)} miles{zone?.zone ? `, ${zone.zone.name}` : ', outside the usual zones'}</dd></div>
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
            <div><dt>Guide price</dt><dd className="st-strong">{money(total)}</dd></div>
            {Number(cfg.bundleDiscount) > 0 && <div><dt>Discount included</dt><dd>{money(cfg.bundleDiscount)}{cfg.promoCode ? ` (code ${cfg.promoCode})` : ''}</dd></div>}
            <div><dt>Deposit received</dt><dd>{money(deposit)}</dd></div>
            <div><dt>Still to pay</dt><dd className="st-strong">{money(Math.max(0, total - deposit))}</dd></div>
          </dl>
          <form className="st-deposit" onSubmit={saveDeposit}>
            <label htmlFor="st-deposit-input">Deposit received (£)</label>
            <div className="st-deposit-row">
              <input
                id="st-deposit-input"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={depositInput}
                onChange={e => setDepositInput(e.target.value)}
              />
              <button type="submit" className="st-btn">Save deposit</button>
            </div>
          </form>
        </section>

        {garland && (
          <section className="st-panel st-panel-wide" aria-labelledby="st-balloons">
            <h4 id="st-balloons" className="st-panel-title">Balloons to prepare</h4>
            <WorkshopBalloonPullList garland={garland} colours={colours} isExpandedDefault={false} />
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
