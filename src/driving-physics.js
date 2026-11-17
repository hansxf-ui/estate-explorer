// Small, deterministic 2D collision helpers for the SUV footprint.
// The vehicle is an oriented rectangle; world colliders are axis-aligned boxes.
export function obbIntersectsAabb2D(vehicle, box) {
  const halfWidth = vehicle.halfWidth;
  const halfLength = vehicle.halfLength;
  const cos = Math.cos(vehicle.yaw || 0);
  const sin = Math.sin(vehicle.yaw || 0);
  const boxHalfX = (box.maxX - box.minX) * 0.5;
  const boxHalfZ = (box.maxZ - box.minZ) * 0.5;
  const dx = (box.minX + box.maxX) * 0.5 - vehicle.x;
  const dz = (box.minZ + box.maxZ) * 0.5 - vehicle.z;

  // World X and Z axes.
  const worldXRadius = halfWidth * Math.abs(cos) + halfLength * Math.abs(sin);
  const worldZRadius = halfWidth * Math.abs(sin) + halfLength * Math.abs(cos);
  if (Math.abs(dx) > boxHalfX + worldXRadius) return false;
  if (Math.abs(dz) > boxHalfZ + worldZRadius) return false;

  // Vehicle-local right and forward axes.
  const localX = dx * cos - dz * sin;
  const localZ = dx * sin + dz * cos;
  const localXRadius = boxHalfX * Math.abs(cos) + boxHalfZ * Math.abs(sin);
  const localZRadius = boxHalfX * Math.abs(sin) + boxHalfZ * Math.abs(cos);
  if (Math.abs(localX) > halfWidth + localXRadius) return false;
  if (Math.abs(localZ) > halfLength + localZRadius) return false;
  return true;
}

export function obbIntersectsCircle2D(vehicle, circleX, circleZ, radius) {
  const cos = Math.cos(vehicle.yaw || 0);
  const sin = Math.sin(vehicle.yaw || 0);
  const dx = circleX - vehicle.x;
  const dz = circleZ - vehicle.z;
  const localX = dx * cos - dz * sin;
  const localZ = dx * sin + dz * cos;
  const closestX = Math.max(-vehicle.halfWidth, Math.min(vehicle.halfWidth, localX));
  const closestZ = Math.max(-vehicle.halfLength, Math.min(vehicle.halfLength, localZ));
  const offsetX = localX - closestX;
  const offsetZ = localZ - closestZ;
  return offsetX * offsetX + offsetZ * offsetZ <= radius * radius;
}

export function vehicleYawRate(speed, steering) {
  if (Math.abs(speed) < 0.02 || Math.abs(steering) < 0.001) return 0;
  const speedRatio = Math.min(1, Math.abs(speed) / 18);
  const steeringAuthority = Math.min(1, Math.abs(speed) / 1.5);
  const direction = speed < 0 ? -1 : 1;
  return steering * (0.1 + speedRatio * 0.82) * steeringAuthority * direction;
}


export function isPavedRoadSurface(x, z) {
  const inRange = (value, min, max) => value >= min && value <= max;
  const driveway = Math.abs(x) <= 4.8 && inRange(z, 5, 51);
  const drivewayParkingPad = inRange(x, 2.4, 10.6) && inRange(z, 28, 40);
  const estateGarageApron = Math.abs(x - 22) <= 6.8 && inRange(z, 27.7, 31.4);
  const estateGarageInterior = inRange(x, 16.7, 27.3) && inRange(z, 30.8, 40.3);
  const arrivalRoad = inRange(z, 55, 73);
  const districtBoulevard = Math.abs(x) <= 6.9 && inRange(z, 47.5, 107.5);
  const districtCrossStreet = Math.abs(z - 76) <= 4.9 && Math.abs(x) <= 44;
  const shopParking = Math.abs(z - 78.9) <= 1.9 && (Math.abs(x + 25) <= 6.6 || Math.abs(x - 25) <= 6.6);
  const northBoulevard = Math.abs(x) <= 6.9 && inRange(z, 107, 199);
  const northCrossStreet = Math.abs(z - 127) <= 4.9 && Math.abs(x) <= 44;
  const fuelForecourt = Math.abs(x - 28) <= 10 && inRange(z, 126, 134);
  const riversideApproach = inRange(x, -28, 0) && inRange(z, 139.4, 147);
  const autoSpaApron = Math.abs(x + 30) <= 6 && inRange(z, 130, 146);
  const harborCrossStreet = Math.abs(z - 176) <= 4.9 && Math.abs(x) <= 44;
  const rallySideRoads = (inRange(x,-47.5,-38.5) || inRange(x,38.5,47.5)) && inRange(z,127,176);
  const marinaAccessLane = inRange(x, 6, 14.7) && inRange(z, 178, 198);
  const marinaParking = Math.abs(x - 25) <= 11 && inRange(z, 183, 195);
  const marinaApproach = inRange(x, 17, 33) && inRange(z, 193, 200);
  return driveway || drivewayParkingPad || estateGarageApron || estateGarageInterior || arrivalRoad || districtBoulevard || districtCrossStreet || shopParking
    || northBoulevard || northCrossStreet || fuelForecourt || riversideApproach || autoSpaApron
    || harborCrossStreet || rallySideRoads || marinaAccessLane || marinaParking || marinaApproach;
}
