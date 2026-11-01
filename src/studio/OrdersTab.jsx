import React, { useState, useMemo, useEffect } from 'react';
import { buildDossierOrderLines } from './OrderDossierParts';
import { OrderDetail } from './OrderDetail';
import { DateTicket } from './DateTicket';
import { AddBooking } from './AddBooking';
import { statusInfo, parseEventDate, startOfToday, money, orderTotal } from './studioFormat';

// Orders fall into three groups, each in the order Laura works through them
function groupOrders(quotes) {
  const today = startOfToday();
  const groups = { reply: [], quoted: [], booked: [], finished: [] };
  quotes.forEach(q => {
    const tone = statusInfo(q.status).tone;
    const date = parseEventDate(q.client?.eventDate);
    if (tone === 'new') groups.reply.push(q);
    else if (tone === 'quoted' && !(date && date < today)) groups.quoted.push(q);
    else if (tone === 'done' || tone === 'cancelled' || (date && date < today)) groups.finished.push(q);
    else groups.booked.push(q);
  });
  const byDate = dir => (a, b) => {
    const da = parseEventDate(a.client?.eventDate);
    const db = parseEventDate(b.client?.eventDate);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return dir * (da - db);
  };
  groups.reply.sort(byDate(1));
  groups.quoted.sort(byDate(1));
  groups.booked.sort(byDate(1));
  groups.finished.sort(byDate(-1));
  return [
    { id: 'reply', title: 'Needs a reply', empty: 'No new enquiries waiting.', items: groups.reply },
    { id: 'quoted', title: 'Waiting for a deposit', empty: null, items: groups.quoted },
    { id: 'booked', title: 'Booked', empty: 'No upcoming bookings yet.', items: groups.booked },
    { id: 'finished', title: 'Finished or cancelled', empty: null, items: groups.finished }
  ];
}

function matchesSearch(q, term) {
  if (!term) return true;
  const c = q.client || {};
  return [q.id, c.name, c.phone, c.email, c.postcode, c.venueName]
    .some(v => v && String(v).toLowerCase().includes(term));
}

export function OrdersTab({
  quotes,
  selectedOrderId,
  onSelectOrder,
  onUpdateOrder,
  onAddBooking,
  onIssueDocument,
  onDocumentAction,
  documentSource,
  curatedPalettes,
  startAdding = false,
  onStartedAdding,
  onDeleteQuote,
  studioSettings,
  steps,
  digitOptions,
  balloonColours,
  deliveryConfig,
  google,
  onOpenTab,
  flashToast
}) {
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(startAdding);
  // "Add a booking" from the Today screen opens the form straight away
  useEffect(() => {
    if (startAdding) { setAdding(true); if (onStartedAdding) onStartedAdding(); }
  }, [startAdding]);
  const term = search.trim().toLowerCase();

  const groups = useMemo(
    () => groupOrders(quotes.filter(q => matchesSearch(q, term))),
    [quotes, term]
  );

  const selected = quotes.find(q => q.id === selectedOrderId) || null;

  return (
    <div className={`st-orders ${selected || adding ? 'has-selection' : ''}`}>
      <section className="st-order-list" aria-label="Orders">
        {onAddBooking && (
          <button type="button" className="st-btn st-add-btn" onClick={() => { setAdding(true); onSelectOrder(null); }}>
            Add a booking
          </button>
        )}
        <div className="st-list-search">
          <label htmlFor="st-order-search" className="st-visually-hidden">Search orders</label>
          <input
            id="st-order-search"
            type="search"
            placeholder="Search by name, phone or postcode"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {quotes.length === 0 && (
          <p className="st-empty">No orders yet. New enquiries from the website appear here.</p>
        )}

        {quotes.length > 0 && groups.map(group => (
          (group.items.length > 0 || (group.empty && !term)) && (
            <div key={group.id} className="st-group">
              <h3 className="st-group-title">
                {group.title}
                <span className="st-group-count">{group.items.length}</span>
              </h3>
              {group.items.length === 0 && <p className="st-empty">{group.empty}</p>}
              <ul className="st-cards">
                {group.items.map(q => (
                  <li key={q.id}>
                    <OrderCard
                      order={q}
                      isSelected={q.id === selectedOrderId}
                      onSelect={() => { setAdding(false); onSelectOrder(q.id); }}
                      steps={steps}
                      digitOptions={digitOptions}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )
        ))}
      </section>

      <section className="st-order-pane" aria-label="Order details">
        {adding ? (
          <AddBooking
            steps={steps}
            quotes={quotes}
            settings={studioSettings}
            onAdd={onAddBooking}
            onDone={order => { setAdding(false); onSelectOrder(order.id); }}
            onCancel={() => setAdding(false)}
          />
        ) : selected ? (
          <OrderDetail
            key={selected.id}
            order={selected}
            allOrders={quotes}
            onBack={() => onSelectOrder(null)}
            onSelectOrder={onSelectOrder}
            onUpdateOrder={onUpdateOrder}
            onIssueDocument={onIssueDocument}
            onDocumentAction={onDocumentAction}
            documentSource={documentSource}
            curatedPalettes={curatedPalettes}
            onDeleteQuote={onDeleteQuote}
            studioSettings={studioSettings}
            steps={steps}
            digitOptions={digitOptions}
            balloonColours={balloonColours}
            deliveryConfig={deliveryConfig}
            google={google}
            onOpenTab={onOpenTab}
            flashToast={flashToast}
          />
        ) : (
          <p className="st-pane-placeholder">Choose an order to see where it's up to and what to do next.</p>
        )}
      </section>
    </div>
  );
}

// How long a new enquiry has been waiting for a reply
function waitingFor(iso) {
  const ms = Date.now() - Date.parse(iso || '');
  if (Number.isNaN(ms) || ms < 0) return '';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `Waiting ${Math.max(1, mins)} min`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `Waiting ${hours} hour${hours === 1 ? '' : 's'}`;
  return `Waiting ${Math.round(hours / 24)} days`;
}

function OrderCard({ order, isSelected, onSelect, steps, digitOptions }) {
  const c = order.client || {};
  const status = statusInfo(order.status);
  const date = parseEventDate(c.eventDate);
  const missedDate = date && date < startOfToday() && ['new', 'quoted', 'deposit', 'confirmed'].includes(status.tone);
  const lines = buildDossierOrderLines(order.configuration || {}, steps, digitOptions);
  const summary = lines.length === 0
    ? 'No items recorded'
    : lines.slice(0, 2).map(l => l.title).join(', ') + (lines.length > 2 ? ` and ${lines.length - 2} more` : '');

  return (
    <button
      type="button"
      className={`st-card ${isSelected ? 'is-selected' : ''}`}
      aria-current={isSelected ? 'true' : undefined}
      onClick={onSelect}
    >
      <DateTicket value={c.eventDate} size="small" markPast />
      <span className="st-card-main">
        <span className="st-card-name">{c.name || 'Name not given'}</span>
        <span className="st-code">{order.id}</span>
        <span className="st-card-summary">{summary}</span>
        {missedDate && <span className="st-card-warning">The date has passed</span>}
        {!missedDate && status.tone === 'new' && order.createdAt && <span className="st-card-waiting">{waitingFor(order.createdAt)}</span>}
        <span className="st-card-meta">
          <span className="st-card-price">{money(orderTotal(order))}</span>
          <span className={`st-status st-status-${status.tone}`}>{status.label}</span>
        </span>
      </span>
    </button>
  );
}
