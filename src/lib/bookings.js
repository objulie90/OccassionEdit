// Bookings Laura adds herself, for orders agreed on Facebook, Instagram or the phone.
// server.py builds the same record in POST /api/admin/bookings; the preview has no
// server, so it builds it here.

export const BOOKING_SOURCES = ['Facebook', 'Instagram', 'Phone', 'WhatsApp', 'Email', 'Other'];

export function buildLocalBooking(booking, existing = []) {
  const c = booking.client || {};
  const price = Math.max(0, Number(booking.price) || 0);
  const deposit = Math.min(price || Infinity, Math.max(0, Number(booking.depositPaid) || 0));
  const source = BOOKING_SOURCES.includes(c.source) ? c.source : 'Other';
  const at = new Date().toISOString();
  const history = [{ at, text: `Added by you, booked through ${source}` }];
  if (deposit > 0) history.push({ at, text: `Deposit £${deposit} received` });
  return {
    id: `ADDED-${String(existing.length + 1).padStart(3, '0')}`,
    createdAt: at,
    status: deposit > 0 ? 'Deposit Paid' : 'Quote Sent',
    seenByAdmin: true,
    addedByStaff: true,
    client: {
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      eventDate: c.eventDate,
      postcode: c.postcode || '',
      area: c.area || '',
      hasVenue: c.postcode ? 'yes' : 'no',
      occasion: c.occasion || '',
      notes: c.notes || '',
      source
    },
    configuration: {
      extraIds: booking.propIds || [],
      quotedPrice: price,
      estimatedTotal: price,
      depositPaid: deposit,
      balanceDue: Math.max(0, price - deposit)
    },
    history
  };
}
