import type { ReturnStatus } from '../types';

export const RETURN_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  RETURN_REQUESTED: ['RETURN_APPROVED', 'RETURN_REJECTED', 'RETURN_CANCELLED'],
  RETURN_APPROVED: ['RETURN_IN_TRANSIT', 'RETURN_RECEIVED', 'RETURN_CANCELLED'],
  RETURN_IN_TRANSIT: ['RETURN_RECEIVED', 'RETURN_CANCELLED'],
  RETURN_RECEIVED: ['COMPLETED'],
  COMPLETED: [],
  RETURN_REJECTED: [],
  RETURN_CANCELLED: [],
};

export class InvalidReturnTransitionError extends Error {
  constructor(public from: ReturnStatus, public to: ReturnStatus) {
    super(`Cannot transition Return from status "${from}" to "${to}".`);
    this.name = 'InvalidReturnTransitionError';
  }
}

export function canTransitionReturn(
  from: ReturnStatus | string,
  to: ReturnStatus | string
): boolean {
  if (from === to) return true;
  const allowed = RETURN_TRANSITIONS[from as ReturnStatus];
  return allowed ? allowed.includes(to as ReturnStatus) : false;
}

export function assertValidReturnTransition(
  from: ReturnStatus | string,
  to: ReturnStatus | string
): void {
  if (from === to) return;
  if (!canTransitionReturn(from, to)) {
    throw new InvalidReturnTransitionError(from as ReturnStatus, to as ReturnStatus);
  }
}

export function canOrderInitiateReturn(orderStatus: string): boolean {
  return orderStatus === 'DELIVERED';
}
