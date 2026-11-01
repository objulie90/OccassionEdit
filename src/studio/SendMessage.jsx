import React, { useState } from 'react';
import { quoteMessage, invoiceMessage, whatsappLink, hasBankDetails } from './messages';
import { money, whatsappNumber } from './studioFormat';

/**
 * Writes the quote or balance invoice for Laura, ready to send by WhatsApp or
 * email. She can change the price (quotes) and any word of the message first.
 */
export function SendMessage({ kind, order, lines, guidePrice, total, paid, settings, google, onSent, onCancel }) {
  const c = order.client || {};
  const isQuote = kind === 'quote';
  const [price, setPrice] = useState(String(Math.round(total * 100) / 100));
  const [edited, setEdited] = useState(null); // Laura's own wording, once she types
  const [copied, setCopied] = useState(false);

  const priceNum = Math.max(0, Number(price) || 0);
  const draft = isQuote
    ? quoteMessage({ order, lines, price: priceNum, settings })
    : invoiceMessage({ order, total, paid, settings });
  const text = edited ?? draft;
  const subject = isQuote ? 'Your quote from The Occasion Edit' : 'Your balance invoice from The Occasion Edit';
  const wa = whatsappLink(whatsappNumber(c.phone), text);
  const canEmail = Boolean(google?.status?.gmail && c.email);
  // The latest quote or invoice written for this order goes with the email
  const doc = [...(order.documents || [])].reverse().find(d => d.kind === (isQuote ? 'quote' : 'invoice') && d.status !== 'void' && d.status !== 'replaced');
  const [emailState, setEmailState] = useState('');
  const sendEmail = async () => {
    setEmailState('sending');
    try {
      await google.sendEmail(order, { subject, body: text, documentId: doc?.id, attachmentName: doc?.number });
      setEmailState('');
      onSent('email', priceNum);
    } catch (e) {
      setEmailState(e.message);
    }
  };
  const what = isQuote ? `Quote of ${money(priceNum)}` : `Balance invoice for ${money(Math.max(0, total - paid))}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch (_e) {
      setCopied('failed');
    }
  };

  return (
    <section className="st-send" aria-label={isQuote ? 'Send quote' : 'Send balance invoice'}>
      <h4 className="st-panel-title">{isQuote ? 'Send quote' : 'Send balance invoice'}</h4>

      {isQuote && (
        <div className="st-field">
          <label htmlFor={`st-quote-price-${order.id}`}>Price (£)</label>
          <input
            id={`st-quote-price-${order.id}`}
            type="number"
            inputMode="decimal"
            min="0"
            value={price}
            onChange={e => { setPrice(e.target.value); setEdited(null); }}
          />
          {guidePrice > 0 && Math.round(guidePrice) !== Math.round(priceNum) && (
            <span className="st-hint">The website's guide price was {money(guidePrice)}.</span>
          )}
        </div>
      )}

      {!hasBankDetails(settings) && (
        <p className="st-warning">Add your bank details in Settings so they go into the message.</p>
      )}

      <div className="st-field">
        <label htmlFor={`st-msg-${kind}-${order.id}`}>Message</label>
        <textarea
          id={`st-msg-${kind}-${order.id}`}
          rows={12}
          value={text}
          onChange={e => setEdited(e.target.value)}
        />
        {edited !== null && (
          <button type="button" className="st-link st-link-quiet" onClick={() => setEdited(null)}>Go back to the standard wording</button>
        )}
      </div>

      <div className="st-send-actions">
        {wa && (
          <a className="st-btn st-btn-primary" href={wa} target="_blank" rel="noopener noreferrer" onClick={() => onSent('WhatsApp', priceNum)}>
            Send by WhatsApp
          </a>
        )}
        {canEmail && (
          <button type="button" className="st-btn" onClick={sendEmail} disabled={emailState === 'sending'}>
            {emailState === 'sending' ? 'Sending' : doc ? `Email it with ${doc.number}` : 'Send by email'}
          </button>
        )}
        <button type="button" className="st-btn" onClick={copy}>Copy message</button>
        <button type="button" className="st-link st-link-quiet" onClick={onCancel}>Cancel</button>
      </div>
      {copied === true && (
        <p className="st-save-state" role="status">
          Copied. Paste it into Messenger, Instagram or wherever you're talking, then{' '}
          <button type="button" className="st-link" onClick={() => onSent('message', priceNum)}>mark it as sent</button>.
        </p>
      )}
      {copied === 'failed' && <p className="st-save-state" role="status">Couldn't copy here. Select the message and copy it yourself.</p>}
      {emailState && emailState !== 'sending' && <p className="st-warning" role="status">{emailState}</p>}
      {!google?.status?.gmail && c.email && <p className="st-hint">Connect Google in Paperwork to email it from here, with the PDF attached.</p>}
      <p className="st-hint">{what} to {c.name || 'the customer'}.</p>
    </section>
  );
}
