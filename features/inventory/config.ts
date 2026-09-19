export const INVENTORY_RESERVATION_MINUTES = Number(process.env.INVENTORY_RESERVATION_MINUTES || '15');
export const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD || '5');

export function getReservationExpiresAt(from: Date = new Date()): Date {
  const expiresAt = new Date(from.getTime());
  expiresAt.setMinutes(expiresAt.getMinutes() + INVENTORY_RESERVATION_MINUTES);
  return expiresAt;
}

