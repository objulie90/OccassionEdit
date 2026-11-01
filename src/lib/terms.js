// Laura's booking terms (her answers, November 2026)
export const BOOKING_TERMS = {
  depositPercent: 50,
  balanceDaysBefore: 7
};

export function depositFor(total, terms = BOOKING_TERMS) {
  return Math.round((Number(total) || 0) * terms.depositPercent) / 100;
}
