export const TAU = Math.PI * 2;

export function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

export function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function circleTouchesCircle(a, radiusA, b, radiusB) {
  const radius = radiusA + radiusB;
  return distanceSquared(a, b) <= radius * radius;
}

export function circleTouchesRect(circle, radius, rect) {
  const nearestX = clamp(circle.x, rect.x, rect.x + rect.w);
  const nearestY = clamp(circle.y, rect.y, rect.y + rect.h);
  const dx = circle.x - nearestX;
  const dy = circle.y - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

export function pointInArena(point, world, radius = 0) {
  return point.x >= radius && point.x <= world.width - radius && point.y >= radius && point.y <= world.height - radius;
}

export function requirementsMet(requirements, activeIds, any = false) {
  if (!requirements || requirements.length === 0) return true;
  if (any) return requirements.some((id) => activeIds.has(id));
  return requirements.every((id) => activeIds.has(id));
}

export function gateIsOpen(gate, activeIds) {
  return requirementsMet(gate.requires, activeIds, gate.any);
}

export function moveCircle(position, velocity, deltaSeconds, radius, solids, world) {
  const next = { x: position.x, y: position.y };
  const dx = velocity.x * deltaSeconds;
  const dy = velocity.y * deltaSeconds;

  next.x = clamp(next.x + dx, radius, world.width - radius);
  for (const solid of solids) {
    if (!circleTouchesRect(next, radius, solid)) continue;
    if (dx > 0) next.x = solid.x - radius;
    else if (dx < 0) next.x = solid.x + solid.w + radius;
  }

  next.y = clamp(next.y + dy, radius, world.height - radius);
  for (const solid of solids) {
    if (!circleTouchesRect(next, radius, solid)) continue;
    if (dy > 0) next.y = solid.y - radius;
    else if (dy < 0) next.y = solid.y + solid.h + radius;
  }

  return next;
}

export function samplePath(path, elapsedSeconds, stepSeconds = 1 / 60) {
  if (!Array.isArray(path) || path.length === 0) return null;
  const position = clamp(elapsedSeconds / stepSeconds, 0, path.length - 1);
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.min(path.length - 1, lowerIndex + 1);
  const amount = position - lowerIndex;
  const lower = path[lowerIndex];
  const upper = path[upperIndex];
  return {
    x: lerp(lower.x, upper.x, amount),
    y: lerp(lower.y, upper.y, amount)
  };
}

export function laserIsActive(hazard, elapsedSeconds) {
  const period = Math.max(.1, hazard.period || 2);
  const phase = ((elapsedSeconds + (hazard.phase || 0)) % period + period) % period;
  return phase < (hazard.on ?? period * .4);
}

export function orbPosition(hazard, elapsedSeconds) {
  const period = Math.max(.1, hazard.period || 3);
  const phase = ((elapsedSeconds + (hazard.phase || 0)) % period) / period;
  const amount = .5 - Math.cos(phase * TAU) * .5;
  return {
    x: lerp(hazard.x, hazard.toX, amount),
    y: lerp(hazard.y, hazard.toY, amount)
  };
}

export function sweepSegment(hazard, elapsedSeconds) {
  const period = Math.max(.1, hazard.period || 4);
  const angle = ((elapsedSeconds + (hazard.phase || 0)) / period) * TAU;
  const x = Math.cos(angle) * hazard.length;
  const y = Math.sin(angle) * hazard.length;
  return {
    ax: hazard.cx - x,
    ay: hazard.cy - y,
    bx: hazard.cx + x,
    by: hazard.cy + y,
    angle
  };
}

export function distanceToSegmentSquared(point, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = point.x - ax;
  const wy = point.y - ay;
  const lengthSquared = vx * vx + vy * vy;
  if (lengthSquared === 0) {
    const dx = point.x - ax;
    const dy = point.y - ay;
    return dx * dx + dy * dy;
  }
  const amount = clamp((wx * vx + wy * vy) / lengthSquared, 0, 1);
  const nearestX = ax + amount * vx;
  const nearestY = ay + amount * vy;
  const dx = point.x - nearestX;
  const dy = point.y - nearestY;
  return dx * dx + dy * dy;
}

export function hazardTouchesPlayer(hazard, player, playerRadius, elapsedSeconds) {
  const forgivingRadius = Math.max(4, playerRadius * .72);
  if (hazard.type === 'laser') {
    return laserIsActive(hazard, elapsedSeconds) && circleTouchesRect(player, forgivingRadius, hazard);
  }
  if (hazard.type === 'orb') {
    const orb = orbPosition(hazard, elapsedSeconds);
    return circleTouchesCircle(player, forgivingRadius, orb, Math.max(3, hazard.r * .78));
  }
  if (hazard.type === 'sweep') {
    const segment = sweepSegment(hazard, elapsedSeconds);
    const collisionRadius = forgivingRadius + Math.max(2, hazard.width * .38);
    return distanceToSegmentSquared(player, segment.ax, segment.ay, segment.bx, segment.by) <= collisionRadius * collisionRadius;
  }
  return false;
}

export function starsForLoops(loops, par) {
  if (loops <= par) return 3;
  if (loops === par + 1) return 2;
  return 1;
}

export function formatClock(seconds) {
  return Math.max(0, seconds).toFixed(2);
}

export function pathLength(path) {
  if (!Array.isArray(path) || path.length < 2) return 0;
  let total = 0;
  for (let index = 1; index < path.length; index += 1) {
    total += Math.sqrt(distanceSquared(path[index - 1], path[index]));
  }
  return total;
}
