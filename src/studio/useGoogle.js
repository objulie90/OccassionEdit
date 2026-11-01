import { useState, useEffect, useCallback } from 'react';

// The demo master sheet, so the preview's links open something real
const DEMO_SHEET = 'https://docs.google.com/spreadsheets/d/1XNZFBP_QGbagnWWr61-AcWdz8J85cpC9LYooho7Prn0/edit';

const DEMO_STATUS = {
  available: true,
  connected: true,
  gmail: true,
  email: 'your Gmail',
  links: { masterSheet: DEMO_SHEET, moneyInOut: `${DEMO_SHEET}#gid=1`, taxYear: 'Tax Year 2026-27' },
  demo: true
};

/**
 * Laura's Google account, paired with the site: Drive for her paperwork, Gmail
 * for talking to customers from inside each order. One sign-in covers both.
 */
export function useGoogle({ enabled, preview, csrfToken, setQuotes }) {
  const [status, setStatus] = useState(preview ? DEMO_STATUS : { loading: true });

  const post = useCallback(async (url, body) => {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken || '' },
      body: JSON.stringify(body || {})
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || "That didn't work. Check your connection and try again.");
    return data;
  }, [csrfToken]);

  const refresh = useCallback(async () => {
    if (preview || !enabled) return;
    try { setStatus(await post('/api/admin/google/status')); } catch (e) { setStatus({ error: e.message }); }
  }, [preview, enabled, post]);

  useEffect(() => { refresh(); }, [refresh]);

  const connect = async () => {
    if (preview) return;
    const { url } = await post('/api/admin/google/start');
    window.location.assign(url);
  };

  const disconnect = async () => {
    if (preview) return;
    await post('/api/admin/google/disconnect');
    refresh();
  };

  const saveClient = async (clientId, clientSecret) => {
    await post('/api/admin/google/client', { clientId, clientSecret });
    refresh();
  };

  const replaceOrders = (orders) => {
    if (!orders?.length) return;
    const byId = Object.fromEntries(orders.map(o => [o.id, o]));
    setQuotes(prev => prev.map(q => byId[q.id] || q));
  };

  const sendEmail = async (order, { subject, body, documentId, attachmentName }) => {
    if (!preview) {
      const data = await post('/api/admin/email/send', { orderId: order.id, subject, body, documentId });
      replaceOrders([data.order]);
      return data;
    }
    const at = new Date().toISOString();
    const message = { id: `demo-${Date.now()}`, dir: 'out', at, subject, text: body, attachment: attachmentName || '' };
    const quoteGoesOut = /^QUOTE /.test(attachmentName || '') && order.status === 'New Enquiry';
    setQuotes(prev => prev.map(q => (q.id !== order.id ? q : {
      ...q,
      status: quoteGoesOut ? 'Quote Sent' : q.status,
      client: { ...q.client, messages: [...(q.client?.messages || []), message] },
      history: [
        ...(q.history || []),
        { at, text: `Emailed: ${subject}${attachmentName ? ` (${attachmentName} attached)` : ''}` },
        ...(quoteGoesOut ? [{ at, text: 'Quote sent by email' }] : [])
      ]
    })));
    return { ok: true };
  };

  // On demand: one order when Laura opens it, or every open order from Today
  const checkEmail = async (order) => {
    if (!preview) {
      const data = await post('/api/admin/email/check', order ? { orderId: order.id } : {});
      replaceOrders(data.orders);
      return data.newEmails || 0;
    }
    const target = order;
    if (!target?.client?.email) return 0;
    const sent = (target.client.messages || []).filter(m => m.dir === 'out');
    const replied = (target.client.messages || []).some(m => m.id === `demo-reply-${sent.length}`);
    if (!sent.length || replied) return 0;
    const first = (target.client.name || '').split(' ')[0] || 'there';
    const at = new Date().toISOString();
    const reply = {
      id: `demo-reply-${sent.length}`,
      dir: 'in',
      at,
      subject: `Re: ${sent[sent.length - 1].subject}`,
      text: `Hi Laura,\n\nThank you, that looks perfect. I'll send the deposit tonight.\n\n${target.client.name || first}`
    };
    setQuotes(prev => prev.map(q => (q.id !== target.id ? q : {
      ...q,
      client: { ...q.client, messages: [...(q.client?.messages || []), reply] },
      history: [...(q.history || []), { at, text: `1 new email from ${target.client.name || 'the customer'}` }]
    })));
    return 1;
  };

  return { status, refresh, connect, disconnect, saveClient, sendEmail, checkEmail };
}
