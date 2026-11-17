// Small gameplay invariants that should remain correct regardless of scene state.
export function findSafeSeatExit(seat, isBlocked, preferredOffset = 0.88) {
  if (!seat || typeof isBlocked !== 'function') return null;
  const { x, z, yaw } = seat;
  if (![x, z, yaw].every(Number.isFinite)) return null;

  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const preferred = [
    { x: x + sin * preferredOffset, z: z - cos * preferredOffset },
    { x: x + cos * preferredOffset, z: z + sin * preferredOffset },
    { x: x - cos * preferredOffset, z: z - sin * preferredOffset },
    { x: x - sin * preferredOffset, z: z + cos * preferredOffset }
  ];

  for (const candidate of preferred) {
    if (!isBlocked(candidate.x, candidate.z)) return candidate;
  }

  // If all cardinal exits are blocked, search a wider ring around the seat.
  for (const radius of [1.2, 1.6, 2.0]) {
    for (let step = 0; step < 16; step++) {
      const angle = yaw + step * (Math.PI * 2 / 16);
      const candidate = { x: x + Math.sin(angle) * radius, z: z - Math.cos(angle) * radius };
      if (!isBlocked(candidate.x, candidate.z)) return candidate;
    }
  }

  return null;
}

export function isValidSaveEnvelope(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (![3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18].includes(data.version)) return false;
  if (!data.player || ![data.player.x, data.player.z].every(Number.isFinite)) return false;
  if (data.player.y !== undefined && !Number.isFinite(data.player.y)) return false;
  if (!data.vehicle || ![data.vehicle.x, data.vehicle.z].every(Number.isFinite)) return false;
  return true;
}
