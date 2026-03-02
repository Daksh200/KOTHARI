/**
 * Inventory Management Service
 * Handles stock-in, stock-out, sales, returns, adjustments
 * Supports piece-based and meter-based (roll) inventory
 */

export enum StockMovementType {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJUSTMENT',
  SALE = 'SALE',
  RETURN = 'RETURN',
  PURCHASE = 'PURCHASE',
}

export interface StockMovement {
  inventoryItemId: number;
  type: StockMovementType;
  changeQty: number;
  changeMeters?: number;
  referenceType?: string; // 'INVOICE', 'PURCHASE_ORDER', 'MANUAL', etc.
  referenceId?: number;
  note?: string;
  performedById?: number; // userId
}

export interface InventoryCheck {
  available: boolean;
  currentQty: number;
  currentMeters: number;
  requestedQty: number;
  requestedMeters: number;
  shortage: number;
}

/**
 * Check if sufficient stock is available for a sale
 */
export function checkStock(
  currentQty: number,
  currentMeters: number,
  requestedQty: number,
  requestedMeters: number,
  isMeterBased: boolean
): InventoryCheck {
  if (isMeterBased) {
    const shortage = Math.max(0, requestedMeters - currentMeters);
    return {
      available: shortage === 0,
      currentQty,
      currentMeters,
      requestedQty,
      requestedMeters,
      shortage,
    };
  } else {
    const shortage = Math.max(0, requestedQty - currentQty);
    return {
      available: shortage === 0,
      currentQty,
      currentMeters,
      requestedQty,
      requestedMeters,
      shortage,
    };
  }
}

/**
 * Calculate new inventory state after a movement
 */
export function calculateNewInventory(
  currentQty: number,
  currentMeters: number | null,
  movement: StockMovement
): {
  newQty: number;
  newMeters: number | null;
} {
  if (movement.type === StockMovementType.SALE) {
    if (currentMeters !== null && movement.changeMeters) {
      // Meter-based sale (e.g., cloth roll)
      return {
        newQty: currentQty - (movement.changeQty || 0),
        newMeters: Math.max(0, currentMeters - movement.changeMeters),
      };
    } else {
      // Piece-based sale
      return {
        newQty: Math.max(0, currentQty - movement.changeQty),
        newMeters: currentMeters,
      };
    }
  } else if (
    movement.type === StockMovementType.IN ||
    movement.type === StockMovementType.PURCHASE
  ) {
    if (currentMeters !== null && movement.changeMeters) {
      return {
        newQty: currentQty + (movement.changeQty || 0),
        newMeters: currentMeters + movement.changeMeters,
      };
    } else {
      return {
        newQty: currentQty + movement.changeQty,
        newMeters: currentMeters,
      };
    }
  } else if (movement.type === StockMovementType.RETURN) {
    if (currentMeters !== null && movement.changeMeters) {
      return {
        newQty: currentQty + (movement.changeQty || 0),
        newMeters: currentMeters + movement.changeMeters,
      };
    } else {
      return {
        newQty: currentQty + movement.changeQty,
        newMeters: currentMeters,
      };
    }
  } else if (movement.type === StockMovementType.ADJUSTMENT) {
    // Direct adjustment
    return {
      newQty: currentQty + movement.changeQty,
      newMeters: currentMeters ? currentMeters + (movement.changeMeters || 0) : null,
    };
  }

  return { newQty: currentQty, newMeters: currentMeters };
}

/**
 * Low stock alert threshold
 */
export function isLowStock(
  currentQty: number,
  reorderLevel: number,
  isMeterBased: boolean,
  currentMeters?: number,
  meterReorderLevel?: number
): boolean {
  if (isMeterBased && currentMeters !== undefined && meterReorderLevel) {
    return currentMeters < meterReorderLevel;
  } else {
    return currentQty < reorderLevel;
  }
}
