// Prototype 40.8 — pure farm-to-table inventory rules for the Corner Cafe.
// Keeping these calculations pure makes the delivery and stock-priority rules testable without WebGL.
export const cafeLocalSupplyCatalog = Object.freeze([
  Object.freeze({ key: 'tomato', item: 'harvestTomato', inputName: 'Fresh Tomato', icon: '🍅', quantity: 3, servings: 5, marketUnitValue: 18, skill: 'gardening', skillBonus: 0.03, source: 'ESTATE GARDEN' }),
  Object.freeze({ key: 'carrot', item: 'harvestCarrot', inputName: 'Fresh Carrot', icon: '🥕', quantity: 4, servings: 5, marketUnitValue: 14, skill: 'gardening', skillBonus: 0.03, source: 'ESTATE GARDEN' }),
  Object.freeze({ key: 'strawberry', item: 'harvestStrawberry', inputName: 'Fresh Strawberry', icon: '🍓', quantity: 3, servings: 6, marketUnitValue: 26, skill: 'gardening', skillBonus: 0.03, source: 'ESTATE GARDEN' }),
  Object.freeze({ key: 'tomatoPreserve', item: 'tomatoPreserve', inputName: 'Tomato Preserve', icon: '🫙', quantity: 1, servings: 8, marketUnitValue: 105, skill: 'cooking', skillBonus: 0.02, source: 'ARTISAN WORKSHOP' }),
  Object.freeze({ key: 'carrotJuice', item: 'carrotJuice', inputName: 'Carrot Juice', icon: '🥤', quantity: 1, servings: 7, marketUnitValue: 85, skill: 'cooking', skillBonus: 0.02, source: 'ARTISAN WORKSHOP' }),
  Object.freeze({ key: 'strawberryJam', item: 'strawberryJam', inputName: 'Strawberry Jam', icon: '🍓', quantity: 1, servings: 9, marketUnitValue: 125, skill: 'cooking', skillBonus: 0.02, source: 'ARTISAN WORKSHOP' })
]);

const localSupplyByKey = new Map(cafeLocalSupplyCatalog.map(supply => [supply.key, supply]));

export function planCafeLocalSupplyDelivery({ supplyKey, inventory, localStock = 0, capacity = 24 } = {}) {
  const supply = localSupplyByKey.get(supplyKey);
  if (!supply) return { ok: false, reason: 'unknown-supply' };
  const owned = Math.max(0, Math.floor(Number(inventory?.[supply.item]) || 0));
  if (owned < supply.quantity) return { ok: false, reason: 'insufficient-inventory', supply, required: supply.quantity, owned };
  const currentStock = Math.max(0, Math.floor(Number(localStock) || 0));
  const maxStock = Math.max(0, Math.floor(Number(capacity) || 0));
  if (currentStock + supply.servings > maxStock) {
    return { ok: false, reason: 'capacity-exceeded', supply, currentStock, capacity: maxStock, freeSpace: Math.max(0, maxStock - currentStock) };
  }
  return {
    ok: true,
    supply,
    consumed: supply.quantity,
    remainingInventory: owned - supply.quantity,
    deliveredServings: supply.servings,
    nextLocalStock: currentStock + supply.servings
  };
}

export function consumeCafeBusinessStock({ wholesaleStock = 0, localStock = 0, dailyStockUse = 3 } = {}) {
  const wholesale = Math.max(0, Math.floor(Number(wholesaleStock) || 0));
  const local = Math.max(0, Math.floor(Number(localStock) || 0));
  const requested = Math.max(0, Math.floor(Number(dailyStockUse) || 0));
  const available = wholesale + local;
  if (available < requested) {
    return { ok: false, available, requested, localUsed: 0, wholesaleUsed: 0, nextLocalStock: local, nextWholesaleStock: wholesale };
  }
  const localUsed = Math.min(local, requested);
  const wholesaleUsed = requested - localUsed;
  return {
    ok: true,
    available,
    requested,
    localUsed,
    wholesaleUsed,
    nextLocalStock: local - localUsed,
    nextWholesaleStock: wholesale - wholesaleUsed
  };
}
