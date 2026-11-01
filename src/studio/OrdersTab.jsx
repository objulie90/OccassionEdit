import React, { useState, useMemo } from 'react';
import { buildDossierOrderLines } from './OrderDossierParts';
import { OrderDetail } from './OrderDetail';
import { DateTicket } from './DateTicket';
import { statusInfo, parseEventDate, startOfToday, money, orderTotal } from './studioFormat';

// Orders fall into three groups, each in the order Laura works through them
function groupOrders(quotes) {
  const today = startOfToday();
  const groups = { reply: [], booked: [], finished: [] };
  quotes.forEach(q => {
    const tone = statusInfo(q.status).tone;
    const date = parseEventDate(q.client?.eventDate);
    if (tone === 'new') groups.reply.push(q);
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
  groups.booked.sort(byDate(1));
  groups.finished.sort(byDate(-1));
  return [
    { id: 'reply', title: 'Needs a reply', empty: 'No new enquiries waiting.', items: groups.reply },
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
  onUpdateQuoteStatus,
  onDeleteQuote,
  steps,
  digitOptions,
  balloonColours,
  deliveryConfig,
  flashToast
}) {
  const [search, setSearch] = useState('');
  const term = search.trim().toLowerCase();

  const groups = useMemo(
    () => groupOrders(quotes.filter(q => matchesSearch(q, term))),
    [quotes, term]
  );

  const selected = quotes.find(q => q.id === selectedOrderId) || null;

  return (
    <div className={`st-orders ${selected ? 'has-selection' : ''}`}>
      <section className="st-order-list" aria-label="Orders">
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
                      onSelect={() => onSelectOrder(q.id)}
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
        {selected ? (
          <OrderDetail
            key={selected.id}
            order={selected}
            allOrders={quotes}
            onBack={() => onSelectOrder(null)}
            onSelectOrder={onSelectOrder}
            onUpdateQuoteStatus={onUpdateQuoteStatus}
            onDeleteQuote={onDeleteQuote}
            steps={steps}
            digitOptions={digitOptions}
            balloonColours={balloonColours}
            deliveryConfig={deliveryConfig}
            flashToast={flashToast}
          />
        ) : (
          <p className="st-pane-placeholder">Choose an order to see everything about it.</p>
        )}
      </section>
    </div>
  );
}

function OrderCard({ order, isSelected, onSelect, steps, digitOptions }) {
  const c = order.client || {};
  const status = statusInfo(order.status);
  const date = parseEventDate(c.eventDate);
  const missedDate = date && date < startOfToday() && (status.tone === 'new' || status.tone === 'deposit' || status.tone === 'confirmed');
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
        <span className="st-card-summary">{summary}</span>
        {missedDate && <span className="st-card-warning">The date has passed</span>}
        <span className="st-card-meta">
          <span className="st-card-price">{money(orderTotal(order))}</span>
          <span className={`st-status st-status-${status.tone}`}>{status.label}</span>
        </span>
      </span>
    </button>
  );
}
