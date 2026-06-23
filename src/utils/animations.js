// ── Easing Functions ──────────────────────────────────────────────────────────

// Smooth sine easing (in-out)
function easeInOutSine(x) {
  return -(Math.cos(Math.PI * x) - 1) / 2
}

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
    // Horizontal ping-pong using smooth sine wave
    const period = 5 / speed
    const ts = (timeSec % period) / period
    const tri = ts < 0.5 ? ts * 2 : 2 - ts * 2
    const eased = easeInOutSine(tri)
    newConfig.xPct = bounds.minX + eased * (bounds.maxX - bounds.minX)
  }
  else if (anim === 'bounce') {
    // Sharp linear bounce (DVD screensaver style - constant speed, sharp edge reflections)
    const periodX = 10 / speed
    const periodY = 13.5 / speed
    
    // X Axis: Linear reflection
    const tx = (timeSec % periodX) / periodX
    const triX = tx < 0.5 ? tx * 2 : 2 - tx * 2
    newConfig.xPct = bounds.minX + triX * (bounds.maxX - bounds.minX)
    
    // Y Axis: Linear reflection
    const ty = (timeSec % periodY) / periodY
    const triY = ty < 0.5 ? ty * 2 : 2 - ty * 2
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
  else if (anim === 'fade') {
    // Opacity oscillates between 40% and 100%
    const fadeSpeed = speed * Math.PI
    const alphaMod = 0.7 + Math.sin(timeSec * fadeSpeed) * 0.3
    newConfig.opacity = (baseConfig.opacity ?? 100) * alphaMod
  }
  else if (anim === 'float') {
    // Gentle vertical bobbing (±5% of bounds)
    const floatSpeed = speed * Math.PI
    const offset = Math.sin(timeSec * floatSpeed) * 5
    newConfig.yPct = Math.max(bounds.minY, Math.min(bounds.maxY, (baseConfig.yPct ?? 50) + offset))
  }
  else if (anim === 'shake') {
    // Rapid small random-looking offsets (using high-freq sines)
    const shakeSpeed = speed * 15
    const offsetX = Math.sin(timeSec * shakeSpeed) * Math.cos(timeSec * shakeSpeed * 1.3) * 2
    const offsetY = Math.cos(timeSec * shakeSpeed * 1.1) * Math.sin(timeSec * shakeSpeed * 0.8) * 2
    newConfig.xPct = Math.max(bounds.minX, Math.min(bounds.maxX, (baseConfig.xPct ?? 50) + offsetX))
    newConfig.yPct = Math.max(bounds.minY, Math.min(bounds.maxY, (baseConfig.yPct ?? 50) + offsetY))
  }
  else if (anim === 'zoom') {
    // Slow dramatic scale from 50% to 150% and back
    const period = 8 / speed
    const ts = (timeSec % period) / period
    const tri = ts < 0.5 ? ts * 2 : 2 - ts * 2
    const eased = easeInOutSine(tri)
    const scaleMod = 0.5 + (eased * 1.0) // 0.5 to 1.5
    newConfig.scale = (baseConfig.scale ?? 100) * scaleMod
  }

  return newConfig
}
