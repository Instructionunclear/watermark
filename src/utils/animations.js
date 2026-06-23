/**
 * Pure, stateless animation engine for watermarks.
 * By using timeSec (current playback time in seconds), we ensure perfect
 * synchronization between the live preview and the final FFmpeg render without
 * needing complex state refs for velocity or position.
 */
export function applyAnimation(baseConfig, timeSec, bounds) {
  const anim = baseConfig.animation || 'none'
  if (anim === 'none') return baseConfig

  // Speed factor: animSpeed 1-10 mapped to a multiplier
  const speed = (baseConfig.animSpeed ?? 5) / 5
  let newConfig = { ...baseConfig }

  if (anim === 'slide') {
    // Horizontal ping-pong using a triangle wave
    const period = 5 / speed
    const ts = (timeSec % period) / period
    const tri = ts < 0.5 ? ts * 2 : 2 - ts * 2
    newConfig.xPct = bounds.minX + tri * (bounds.maxX - bounds.minX)
  }
  else if (anim === 'bounce') {
    // Diagonal ping-pong with offset frequencies for X and Y
    const periodX = 10 / speed
    const periodY = 13.5 / speed
    const tx = (timeSec % periodX) / periodX
    const ty = (timeSec % periodY) / periodY
    const triX = tx < 0.5 ? tx * 2 : 2 - tx * 2
    const triY = ty < 0.5 ? ty * 2 : 2 - ty * 2
    newConfig.xPct = bounds.minX + triX * (bounds.maxX - bounds.minX)
    newConfig.yPct = bounds.minY + triY * (bounds.maxY - bounds.minY)
  }
  else if (anim === 'pulse') {
    // Scale ranges from 80% to 120% of base scale
    const pulseSpeed = speed * Math.PI
    const scaleMod = 1 + Math.sin(timeSec * pulseSpeed) * 0.2
    newConfig.scale = (baseConfig.scale ?? 100) * scaleMod
  }
  else if (anim === 'spin') {
    // Continuous rotation
    const spinSpeed = speed * 90 // degrees per second
    newConfig.rotation = (baseConfig.rotation ?? 0) + (timeSec * spinSpeed)
  }

  return newConfig
}
