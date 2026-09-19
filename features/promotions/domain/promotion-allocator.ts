import { CartItemForDiscount, ItemDiscountAllocation } from '../types';

/**
 * Distributes a total discount amount across eligible items proportionally to their subtotals.
 * Uses integer math with remainder resolution to ensure:
 * 1. sum(allocations) === totalDiscount (or eligibleSubtotal if totalDiscount > eligibleSubtotal)
 * 2. allocation_i <= item_subtotal_i
 * 3. Ineligible items receive 0 allocation
 */
export function allocateDiscountAcrossItems(
  items: CartItemForDiscount[],
  eligibleItemIndices: Set<number>,
  totalDiscount: number
): ItemDiscountAllocation[] {
  // Initialize all items with 0 allocation
  const result: ItemDiscountAllocation[] = items.map((item) => ({
    productId: item.productId,
    subtotal: item.subtotal,
    discountAllocation: 0,
  }));

  if (totalDiscount <= 0 || eligibleItemIndices.size === 0) {
    return result;
  }

  // Calculate total eligible subtotal
  let eligibleSubtotal = 0;
  for (const idx of eligibleItemIndices) {
    eligibleSubtotal += items[idx].subtotal;
  }

  if (eligibleSubtotal <= 0) {
    return result;
  }

  // Discount cannot exceed eligible subtotal
  const effectiveDiscount = Math.min(totalDiscount, eligibleSubtotal);

  // If discount covers entire eligible subtotal, allocate full subtotal to each
  if (effectiveDiscount === eligibleSubtotal) {
    for (const idx of eligibleItemIndices) {
      result[idx].discountAllocation = items[idx].subtotal;
    }
    return result;
  }

  // Calculate preliminary floor allocation and track fractional remainders
  interface EligibleItemPart {
    index: number;
    subtotal: number;
    floorAlloc: number;
    remainderFraction: number;
  }

  const eligibleParts: EligibleItemPart[] = [];
  let allocatedSum = 0;

  for (const idx of eligibleItemIndices) {
    const itemSubtotal = items[idx].subtotal;
    const numerator = effectiveDiscount * itemSubtotal;
    const floorAlloc = Math.floor(numerator / eligibleSubtotal);
    const remainderFraction = numerator % eligibleSubtotal;

    allocatedSum += floorAlloc;
    eligibleParts.push({
      index: idx,
      subtotal: itemSubtotal,
      floorAlloc,
      remainderFraction,
    });
  }

  let remainderToDistribute = effectiveDiscount - allocatedSum;

  // Sort items by largest fractional remainder first to distribute the +1 remainder fairly
  eligibleParts.sort((a, b) => b.remainderFraction - a.remainderFraction);

  for (const part of eligibleParts) {
    let finalAlloc = part.floorAlloc;
    if (remainderToDistribute > 0 && finalAlloc < part.subtotal) {
      finalAlloc += 1;
      remainderToDistribute -= 1;
    }
    result[part.index].discountAllocation = finalAlloc;
  }

  return result;
}
