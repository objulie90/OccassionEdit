import React, { useMemo, useState } from 'react';
import { buildDossierOrderLines } from './OrderDossierParts';
import { statusInfo, parseEventDate, startOfToday, sameDay, money, orderTotal, paidSoFar, describeDaysUntil, daysUntil } from './studioFormat';
import { balanceDueDate } from './messages';
import { committedBalloons, BALLOON_SIZES, DEFAULT_LOW_STOCK } from './stockModel';
import { saleState, saleBannerText } from '../lib/sale';
import { pricesToConfirm } from './inventoryModel';

function shortDate(date) {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function waitingFor(iso) {
  const ms = Date.now() - Date.parse(iso || '');
  if (Number.isNaN(ms) || ms < 0) return '';
  const hours = Math.round(ms / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'}`;
  return `${Math.round(hours / 24)} days`;
}

function lastEntry(order, pattern) {
  const hit = [...(order.history || [])].reverse().find(h => pattern.test(h.text));
  return hit ? new Date(hit.at) : null;
}

/**
 * The Studio's home: what needs doing today, in the order it matters.
 * Every line opens the order or screen it's about.
 */
export function TodayTab({ quotes = [], steps = [], digitOptions = [], balloonColours = [], studioSettings = {}, sale, onOpenOrder, onGo, onAddBooking, google }) {
  const g = google?.status || {};
  const [mailState, setMailState] = useState('');
  const checkMail = async () => {
    setMailState('checking');
    try {
      const n = await google.checkEmail(null);
      setMailState(n ? `${n} new email${n === 1 ? '' : 's'} from customers.` : 'No new emails from customers.');
    } catch (e) {
      setMailState(e.message);
    }
  };
  // Customers whose last email to Laura hasn't had an answer yet
  const unanswered = quotes.filter(q => {
    const m = q.client?.messages || [];
    return m.length && m[m.length - 1].dir === 'in';
  });
  const today = startOfToday();
  const dated = q => parseEventDate(q.client?.eventDate);
  const tone = q => statusInfo(q.status).tone;

  const view = useMemo(() => {
    const live = quotes.filter(q => tone(q) !== 'cancelled');
    const reply = live.filter(q => tone(q) === 'new').sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    const deposits = live.filter(q => tone(q) === 'quoted' && dated(q) && dated(q) >= today).sort((a, b) => dated(a) - dated(b));
    const balances = live
      .filter(q => tone(q) === 'deposit' && dated(q) && dated(q) >= today)
      .map(q => ({ q, due: balanceDueDate(q.client?.eventDate), left: Math.max(0, orderTotal(q) - paidSoFar(q)) }))
      .filter(x => x.left > 0 && x.due && daysUntil(x.due) <= 14)
      .sort((a, b) => a.due - b.due);
    const week = live
      .filter(q => ['deposit', 'confirmed'].includes(tone(q)) && dated(q) && daysUntil(dated(q)) >= 0 && daysUntil(dated(q)) <= 7)
      .sort((a, b) => dated(a) - dated(b));
    const hireIds = new Set(steps.flatMap(st => st.items || []).filter(it => it.hireOnly && !it.madeToOrder).map(it => it.id));
    const collect = live.filter(q => {
      const d = dated(q);
      if (!d || !['deposit', 'confirmed', 'done'].includes(tone(q))) return false;
      const ids = [q.configuration?.backdropId, ...(q.configuration?.extraIds || [])].filter(id => hireIds.has(id));
      return ids.length > 0 && (daysUntil(d) === -1 || daysUntil(d) === 0);
    });
    const booked = committedBalloons(quotes, steps, balloonColours);
    const counts = studioSettings.balloonStock || {};
    const low = Number(studioSettings.lowStockAt ?? DEFAULT_LOW_STOCK);
    const stock = balloonColours.map(c => {
      const left = BALLOON_SIZES.map(sz => (Number(counts[c.id]?.[sz.key]) || 0) - (booked[c.id]?.[sz.key] || 0));
      return { c, short: left.some(n => n < 0), low: left.some(n => n < low) };
    });
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonth = quotes.filter(q => Date.parse(q.createdAt) >= monthStart.getTime());
    const bookedThisMonth = thisMonth.filter(q => ['deposit', 'confirmed', 'done'].includes(tone(q)));
    const comingUp = live.filter(q => ['deposit', 'confirmed'].includes(tone(q)) && dated(q) && dated(q) >= today);
    return {
      reply, deposits, balances, week, collect,
      short: stock.filter(s => s.short).map(s => s.c),
      low: stock.filter(s => !s.short && s.low && counts[s.c.id]).map(s => s.c),
      hidden: balloonColours.filter(c => !c.inStock),
      blocked: (studioSettings.blockedDates || []).map(parseEventDate).filter(d => d && daysUntil(d) >= 0 && daysUntil(d) <= 30),
      numbers: {
        enquiries: thisMonth.length,
        booked: bookedThisMonth.length,
        bookedValue: comingUp.reduce((sum, q) => sum + orderTotal(q), 0),
        owed: comingUp.reduce((sum, q) => sum + Math.max(0, orderTotal(q) - paidSoFar(q)), 0)
      }
    };
  }, [quotes, steps, balloonColours, studioSettings]);

  const summary = q => {
    const lines = buildDossierOrderLines(q.configuration || {}, steps, digitOptions);
    return lines.length ? lines.slice(0, 2).map(l => l.title).join(', ') + (lines.length > 2 ? ` and ${lines.length - 2} more` : '') : 'No items recorded';
  };
  const saleNow = saleState(sale);
  const basesToPrice = (steps.find(st => st.id === 'backdrop')?.items || []).filter(it => pricesToConfirm(it) > 0);
  const missingPrices = basesToPrice.reduce((n, it) => n + pricesToConfirm(it), 0);
  const allClear = !unanswered.length && !view.reply.length && !view.deposits.length && !view.balances.length && !view.week.length && !view.collect.length && !(studioSettings.stockCountedAt && view.short.length);
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  const Row = ({ q, children, tag }) => (
    <li>
      <button type="button" className="st-today-row" onClick={() => onOpenOrder(q.id)}>
        <span className="st-today-main">
          <span className="st-product-name">{q.client?.name || 'Name not given'}</span>
          <span className="st-today-sub">{children}</span>
        </span>
        {tag && <span className={`st-today-tag ${tag.tone || ''}`}>{tag.text}</span>}
      </button>
    </li>
  );

  return (
    <div className="st-today">
      <header className="st-today-head">
        <h2 className="st-today-title">{greeting}</h2>
        <p className="st-cat-note">{today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}. {allClear ? "Nothing needs you right now." : "Here's what needs you, most urgent first."}</p>
        <div className="st-business-actions">
          {onAddBooking && <button type="button" className="st-btn st-btn-primary" onClick={onAddBooking}>Add a booking</button>}
          <button type="button" className="st-btn" onClick={() => onGo('calendar')}>Open the calendar</button>
          {g.gmail && <button type="button" className="st-btn" onClick={checkMail} disabled={mailState === 'checking'}>{mailState === 'checking' ? 'Checking emails' : 'Check for new emails'}</button>}
          {g.links?.masterSheet
            ? <a className="st-btn" href={g.links.masterSheet} target="_blank" rel="noopener noreferrer">Open the master sheet</a>
            : !g.loading && !g.connected && <button type="button" className="st-btn" onClick={() => onGo('paperwork')}>Connect Google</button>}
        </div>
        {mailState && mailState !== 'checking' && <p className="st-save-state" role="status">{mailState}</p>}
      </header>

      <div className="st-today-grid">
        {unanswered.length > 0 && (
          <section className="st-today-card is-urgent" aria-labelledby="t-mail">
            <h3 id="t-mail" className="st-today-card-title">Emails to answer <span className="st-group-count">{unanswered.length}</span></h3>
            <ul>
              {unanswered.map(q => {
                const last = q.client.messages[q.client.messages.length - 1];
                return <Row key={q.id} q={q} tag={{ text: new Date(last.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }}>{last.subject || 'New email'}</Row>;
              })}
            </ul>
          </section>
        )}
        {view.reply.length > 0 && (
          <section className="st-today-card is-urgent" aria-labelledby="t-reply">
            <h3 id="t-reply" className="st-today-card-title">Waiting for a reply <span className="st-group-count">{view.reply.length}</span></h3>
            <ul>
              {view.reply.map(q => (
                <Row key={q.id} q={q} tag={{ text: `Waiting ${waitingFor(q.createdAt)}`, tone: Date.now() - Date.parse(q.createdAt) > 3600000 ? 'is-late' : '' }}>
                  {dated(q) ? shortDate(dated(q)) : 'No date'} · {summary(q)}
                </Row>
              ))}
            </ul>
          </section>
        )}

        {view.collect.length > 0 && (
          <section className="st-today-card" aria-labelledby="t-collect">
            <h3 id="t-collect" className="st-today-card-title">Props to collect</h3>
            <ul>
              {view.collect.map(q => (
                <Row key={q.id} q={q} tag={{ text: daysUntil(dated(q)) === 0 ? 'Tomorrow' : 'Today' }}>
                  {q.client?.venueName || q.client?.postcode || q.client?.area || 'Venue not given'}
                </Row>
              ))}
            </ul>
          </section>
        )}

        {view.week.length > 0 && (
          <section className="st-today-card" aria-labelledby="t-week">
            <h3 id="t-week" className="st-today-card-title">Jobs this week</h3>
            <ul>
              {view.week.map(q => (
                <Row key={q.id} q={q} tag={{ text: describeDaysUntil(dated(q)) }}>
                  {shortDate(dated(q))}{q.client?.accessTime ? `, access from ${q.client.accessTime}` : ''} · {summary(q)}
                </Row>
              ))}
            </ul>
          </section>
        )}

        {(view.deposits.length > 0 || view.balances.length > 0) && (
          <section className="st-today-card" aria-labelledby="t-money">
            <h3 id="t-money" className="st-today-card-title">Payments due</h3>
            <ul>
              {view.deposits.map(q => {
                const sent = lastEntry(q, /^Quote/);
                return (
                  <Row key={q.id} q={q} tag={{ text: `Deposit ${money(Math.round(orderTotal(q) / 2))}` }}>
                    Quote sent{sent ? ` ${waitingFor(sent.toISOString())} ago` : ''}, waiting for the deposit
                  </Row>
                );
              })}
              {view.balances.map(({ q, due, left }) => (
                <Row key={q.id} q={q} tag={{ text: `Balance ${money(left)}`, tone: daysUntil(due) < 0 ? 'is-late' : '' }}>
                  {daysUntil(due) < 0 ? `Was due ${shortDate(due)}` : `Due ${shortDate(due)}`}
                </Row>
              ))}
            </ul>
          </section>
        )}

        {(!studioSettings.stockCountedAt || view.short.length > 0 || view.low.length > 0 || view.hidden.length > 0) && (
          <section className="st-today-card" aria-labelledby="t-stock">
            <h3 id="t-stock" className="st-today-card-title">Balloon stock</h3>
            {!studioSettings.stockCountedAt && <p className="st-today-sub">Count your balloons once, and this will warn you before anything runs short.</p>}
            {studioSettings.stockCountedAt && view.short.length > 0 && <p className="st-warning">Not enough for booked jobs: {view.short.map(c => c.name).join(', ')}.</p>}
            {view.low.length > 0 && <p className="st-today-sub">Running low: {view.low.map(c => c.name).join(', ')}.</p>}
            {view.hidden.length > 0 && <p className="st-today-sub">Hidden from customers: {view.hidden.map(c => c.name).join(', ')}.</p>}
            <button type="button" className="st-link" onClick={() => onGo('inventory')}>{studioSettings.stockCountedAt ? 'Open balloon stock' : 'Count my balloons'}</button>
          </section>
        )}

        {missingPrices > 0 && (
          <section className="st-today-card is-urgent" aria-labelledby="t-prices">
            <h3 id="t-prices" className="st-today-card-title">Your price list <span className="st-group-count">{missingPrices}</span></h3>
            <p className="st-today-sub">
              {missingPrices} price{missingPrices === 1 ? '' : 's'} to fill in for {basesToPrice.map(it => it.shortName || it.name).join(', ')}. Customers see "Price to confirm" until you do.
            </p>
            <button type="button" className="st-btn" onClick={() => onGo('inventory')}>Fill in my prices</button>
          </section>
        )}

        <section className="st-today-card" aria-labelledby="t-numbers">
          <h3 id="t-numbers" className="st-today-card-title">This month</h3>
          <dl className="st-today-numbers">
            <div><dt>Enquiries</dt><dd>{view.numbers.enquiries}</dd></div>
            <div><dt>Turned into bookings</dt><dd>{view.numbers.booked}</dd></div>
            <div><dt>Booked work to come</dt><dd>{money(view.numbers.bookedValue)}</dd></div>
            <div><dt>Still to be paid</dt><dd>{money(view.numbers.owed)}</dd></div>
          </dl>
        </section>

        {(saleNow === 'live' || saleNow === 'scheduled' || view.blocked.length > 0) && (
          <section className="st-today-card" aria-labelledby="t-notes">
            <h3 id="t-notes" className="st-today-card-title">Good to know</h3>
            {saleNow === 'live' && <p className="st-today-sub">Sale on now: {saleBannerText(sale)}.</p>}
            {saleNow === 'scheduled' && <p className="st-today-sub">A sale starts {shortDate(parseEventDate(sale.start))}.</p>}
            {view.blocked.length > 0 && <p className="st-today-sub">Days you've blocked: {view.blocked.map(shortDate).join(', ')}.</p>}
          </section>
        )}
      </div>
    </div>
  );
}
