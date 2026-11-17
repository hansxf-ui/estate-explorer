// Camera-relative touch/keyboard movement helpers.
// The camera sits behind the player: forward is local -Z and right is local +X.
export function cameraRelativeToWorld(inputRight, inputForward, yaw) {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  return {
    x: inputRight * cos - inputForward * sin,
    z: -inputRight * sin - inputForward * cos
  };
}

export function worldToCameraRelative(worldX, worldZ, yaw) {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  return {
    right: worldX * cos - worldZ * sin,
    forward: -worldX * sin - worldZ * cos
  };
}

export function applyRadialDeadzone(x, y, deadzone = 0.11) {
  const magnitude = Math.hypot(x, y);
  const threshold = Math.max(0, Math.min(0.95, deadzone));
  if (magnitude <= threshold || magnitude === 0) return { x: 0, y: 0 };
  const clampedMagnitude = Math.min(1, magnitude);
  const remappedMagnitude = (clampedMagnitude - threshold) / (1 - threshold);
  const scale = remappedMagnitude / magnitude;
  return { x: x * scale, y: y * scale };
}

export function virtualStickVector(deltaX, deltaY, radius, deadzone = 0.11) {
  if (!Number.isFinite(radius) || radius <= 0) return { x: 0, y: 0 };
  const length = Math.hypot(deltaX, deltaY);
  const scale = length > radius ? radius / length : 1;
  return applyRadialDeadzone((deltaX * scale) / radius, (-deltaY * scale) / radius, deadzone);
}
