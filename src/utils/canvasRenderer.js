// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Calculates text size and constructs the canvas font string.
 */
function getTextMetrics(canvas, wm) {
  // fontSize is expressed as % of the shorter video dimension
  // This ensures identical visual weight on portrait reels AND landscape videos
  const shortSide = Math.min(canvas.width, canvas.height)
  const baseSize = Math.max(6, Math.round(shortSide * ((wm.fontSize ?? 5) / 100)))
  const scale = (wm.scale ?? 100) / 100
  const size = Math.max(6, Math.round(baseSize * scale))

  let fontStr = ''
  if (wm.italic) fontStr += 'italic '
  if (wm.bold)   fontStr += 'bold '
  fontStr += `${size}px '${wm.fontFamily || 'Inter'}', sans-serif`

  return { size, fontStr }
}

/**
 * Draws the watermark onto a 2D canvas context.
 */
export function drawWatermark(ctx, canvas, wm, wmImage) {
  if (!canvas.width || !canvas.height) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const xPct    = wm.xPct ?? 50
  const yPct    = wm.yPct ?? 50
  const opacity = (wm.opacity ?? 100) / 100
  const rotation = ((wm.rotation ?? 0) * Math.PI) / 180

  // Snap translation to whole pixels to avoid sub-pixel blur
  const tx = Math.round((xPct / 100) * canvas.width)
  const ty = Math.round((yPct / 100) * canvas.height)

  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, opacity))
  ctx.translate(tx, ty)
  ctx.rotate(rotation)

  if (wm.type === 'text') {
    const { size, fontStr } = getTextMetrics(canvas, wm)

    ctx.font         = fontStr
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'

    // Crisp text: reset shadow defaults
    ctx.shadowColor   = 'transparent'
    ctx.shadowBlur    = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0

    const text = wm.text || 'Watermark'

    // Outline — draw first so it sits behind the fill
    if (wm.outline) {
      ctx.strokeStyle = 'rgba(0,0,0,0.85)'
      ctx.lineWidth   = Math.max(1.5, size * 0.07)
      ctx.lineJoin    = 'round'
      ctx.strokeText(text, 0, 0)
    }

    // Shadow — applied only to fill.
    // We disable shadow for small text (<14px) because the blur radius
    // makes it look muddy/illegible on standard displays.
    if (wm.shadow && size >= 14) {
      ctx.shadowColor   = 'rgba(0,0,0,0.75)'
      ctx.shadowBlur    = Math.max(2, size * 0.15)
      ctx.shadowOffsetX = Math.round(size * 0.05)
      ctx.shadowOffsetY = Math.round(size * 0.05)
    }

    ctx.fillStyle = wm.color || '#ffffff'
    ctx.fillText(text, 0, 0)

    // Draw a thin crisp outline instead of shadow for small text (<14px)
    if (wm.shadow && size < 14) {
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur  = 0
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'
      ctx.lineWidth   = 1
      ctx.lineJoin    = 'round'
      ctx.strokeText(text, 0, 0)
    }

  } else if (wm.type === 'image' && wmImage) {
    const scale = (wm.scale ?? 100) / 100
    // Base image width is 30% of canvas width. This ensures a sane default size
    // so massive logos don't cover the entire screen immediately.
    const maxW  = canvas.width * 0.3 * scale
    const ratio = wmImage.naturalHeight / wmImage.naturalWidth
    // Snap image draw coords to whole pixels
    const w = Math.round(maxW)
    const h = Math.round(maxW * ratio)
    ctx.drawImage(wmImage, -Math.round(w / 2), -Math.round(h / 2), w, h)
  }

  ctx.restore()
}

/**
 * Calculates the bounding box limits (in percentage) so the watermark
 * does not exceed the canvas bounds when bouncing.
 */
export function getWatermarkBounds(ctx, canvas, wm, wmImage) {
  if (!canvas.width || !canvas.height) return { minX: 0, maxX: 100, minY: 0, maxY: 100 }

  let w = 0, h = 0

  if (wm.type === 'text') {
    const { size, fontStr } = getTextMetrics(canvas, wm)

    ctx.save()
    ctx.font = fontStr
    const text = wm.text || 'Watermark'
    const metrics = ctx.measureText(text)
    w = metrics.width
    // Use actual bounding box ascender/descender sum instead of just 'size'
    // This makes bounding box precise across all fonts.
    h = (metrics.actualBoundingBoxAscent || size) + (metrics.actualBoundingBoxDescent || 0)
    if (h === 0) h = size // fallback
    ctx.restore()
  } else if (wm.type === 'image' && wmImage) {
    const scale = (wm.scale ?? 100) / 100
    const maxW  = canvas.width * 0.3 * scale
    const ratio = wmImage.naturalHeight / wmImage.naturalWidth
    w = maxW
    h = maxW * ratio
  }

  // Account for rotation
  const rotation = ((wm.rotation ?? 0) * Math.PI) / 180
  const cos = Math.abs(Math.cos(rotation))
  const sin = Math.abs(Math.sin(rotation))

  const rw = w * cos + h * sin
  const rh = w * sin + h * cos

  const hwPct = (rw / 2 / canvas.width) * 100
  const hhPct = (rh / 2 / canvas.height) * 100

  let videoMinXPct = 0
  let videoMaxXPct = 100
  let videoMinYPct = 0
  let videoMaxYPct = 100

  // Constrain bounds to the actual video area, ignoring black padding bars
  if (wm.outputRatio && wm.outputRatio !== 'original' && wm.origRatio) {
    // Avoid precision issues by using a tiny tolerance
    const canvasRatio = canvas.width / canvas.height
    if (wm.origRatio > canvasRatio + 0.001) {
      // Letterbox (black bars top/bottom)
      const actualH = canvas.width / wm.origRatio
      const offY = (canvas.height - actualH) / 2
      videoMinYPct = (offY / canvas.height) * 100
      videoMaxYPct = ((offY + actualH) / canvas.height) * 100
    } else if (wm.origRatio < canvasRatio - 0.001) {
      // Pillarbox (black bars left/right)
      const actualW = canvas.height * wm.origRatio
      const offX = (canvas.width - actualW) / 2
      videoMinXPct = (offX / canvas.width) * 100
      videoMaxXPct = ((offX + actualW) / canvas.width) * 100
    }
  }

  const minXPct = videoMinXPct + hwPct
  const maxXPct = videoMaxXPct - hwPct
  const minYPct = videoMinYPct + hhPct
  const maxYPct = videoMaxYPct - hhPct

  return {
    minX: minXPct < maxXPct ? minXPct : 50,
    maxX: minXPct < maxXPct ? maxXPct : 50,
    minY: minYPct < maxYPct ? minYPct : 50,
    maxY: minYPct < maxYPct ? maxYPct : 50
  }
}
