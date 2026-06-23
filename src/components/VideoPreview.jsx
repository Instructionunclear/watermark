import { useRef, useEffect, useCallback, useState } from 'react'
import { drawWatermark, getWatermarkBounds } from '../utils/canvasRenderer'
import { applyAnimation } from '../utils/animations'

export default function VideoPreview({ videoFile, watermark, onWatermarkMove, wmImage }) {
  const videoRef   = useRef(null)
  const canvasRef  = useRef(null)
  const areaRef    = useRef(null)
  const animRef    = useRef(null)
  const dragging   = useRef(false)
  const dragOff    = useRef({ dx: 0, dy: 0 })
  const startTime  = useRef(0)
  const wmRef      = useRef(watermark)
  const videoReady = useRef(false)
  const [nativeRatio, setNativeRatio] = useState('auto')

  // Always keep wmRef current without restarting the draw loop
  useEffect(() => {
    if (wmRef.current.animation !== watermark.animation) {
      startTime.current = performance.now()
    }
    wmRef.current = watermark
  }, [watermark])

  // Target aspect ratio for the wrapper
  const targetRatioStr = (() => {
    const r = watermark.outputRatio
    if (r === '1:1') return '1 / 1'
    if (r === '4:5') return '4 / 5'
    if (r === '16:9') return '16 / 9'
    if (r === '9:16') return '9 / 16'
    return nativeRatio
  })()

  // Resize canvas to match the wrapper element
  const syncSize = useCallback(() => {
    const canvas = canvasRef.current
    const wrapper = areaRef.current?.querySelector('.preview-canvas-wrapper')
    if (!canvas || !wrapper) return
    
    const r = wrapper.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) {
      canvas.width  = Math.round(r.width)
      canvas.height = Math.round(r.height)
    }
  }, [])

  // Call syncSize whenever the aspect ratio setting changes
  useEffect(() => {
    syncSize()
  }, [watermark.outputRatio, syncSize])

  // Main draw loop — runs every rAF, reads watermark via ref (zero re-render lag)
  useEffect(() => {
    syncSize()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const tick = () => {
      const wm = wmRef.current
      if (!canvas.width || !canvas.height) { animRef.current = requestAnimationFrame(tick); return }

      if (!videoReady.current) {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light'
        ctx.fillStyle = isLight ? '#f1f5f9' : '#0d0f18'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        // Subtle grid
        ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'
        ctx.lineWidth = 1
        for (let x = 0; x < canvas.width; x += 40) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
        }
        for (let y = 0; y < canvas.height; y += 40) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
        }
        // Helper label
        ctx.fillStyle = isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.1)'
        ctx.font = '13px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText('← Add a video below to preview →', canvas.width / 2, canvas.height - 10)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }

      // Get original video ratio for constraining animation bounds
      const video = videoRef.current
      const origRatio = (video && video.videoHeight) ? (video.videoWidth / video.videoHeight) : (16 / 9)
      const wmConfig = { ...wm, origRatio }

      // Apply stateless animation (if any)
      const bounds = getWatermarkBounds(ctx, canvas, wmConfig, wmImage)
      if (startTime.current === 0) startTime.current = performance.now()
      const elapsedSec = (performance.now() - startTime.current) / 1000
      const cfg = applyAnimation(wmConfig, elapsedSec, bounds)

      drawWatermark(ctx, canvas, cfg, wmImage)
      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wmImage]) // only restart when image changes; wm is read via ref

  // Load / unload video
  useEffect(() => {
    const video = videoRef.current
    videoReady.current = false
    syncSize()
    if (!video || !videoFile) return
    const url = URL.createObjectURL(videoFile)
    video.src = url
    video.load() // Force browser to load the new blob
    return () => {
      URL.revokeObjectURL(url)
      videoReady.current = false
    }
  }, [videoFile, syncSize])

  useEffect(() => {
    window.addEventListener('resize', syncSize)
    return () => window.removeEventListener('resize', syncSize)
  }, [syncSize])

  // ── Drag to reposition ──────────────────────────────────────────────────────
  const posPct = useCallback((e) => {
    const r  = canvasRef.current.getBoundingClientRect()
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    const cy = e.touches ? e.touches[0].clientY : e.clientY
    return {
      xPct: Math.min(100, Math.max(0, ((cx - r.left) / r.width)  * 100)),
      yPct: Math.min(100, Math.max(0, ((cy - r.top)  / r.height) * 100)),
    }
  }, [])

  const onDown = useCallback((e) => {
    e.preventDefault()
    const anim = wmRef.current.animation
    if (anim === 'bounce' || anim === 'slide') return
    dragging.current = true
    const p = posPct(e)
    dragOff.current = {
      dx: (wmRef.current.xPct ?? 50) - p.xPct,
      dy: (wmRef.current.yPct ?? 50) - p.yPct,
    }
    canvasRef.current.style.cursor = 'grabbing'
  }, [posPct])

  const onMove = useCallback((e) => {
    if (!dragging.current) return
    const p = posPct(e)
    onWatermarkMove(
      Math.min(100, Math.max(0, p.xPct + dragOff.current.dx)),
      Math.min(100, Math.max(0, p.yPct + dragOff.current.dy)),
    )
  }, [onWatermarkMove, posPct])

  const onUp = useCallback(() => {
    dragging.current = false
    const anim = wmRef.current.animation
    if (canvasRef.current && anim !== 'bounce' && anim !== 'slide') {
      canvasRef.current.style.cursor = 'crosshair'
    }
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [onMove, onUp])

  return (
    <div className="preview-area" ref={areaRef}>
      <div 
        className="preview-canvas-wrapper" 
        style={{ 
          aspectRatio: videoFile && targetRatioStr !== 'auto' ? targetRatioStr : '16 / 9',
          width: videoFile ? 'auto' : '100%',
          height: videoFile ? 'auto' : 'auto'
        }}
      >
        {/* Video — hidden until a file is loaded */}
        <video
          ref={videoRef}
          className="preview-video"
          controls loop playsInline
          onLoadedMetadata={() => {
            if (videoRef.current && videoRef.current.videoWidth) {
              setNativeRatio(`${videoRef.current.videoWidth} / ${videoRef.current.videoHeight}`)
            }
          }}
          onLoadedData={() => {
            videoReady.current = true
            syncSize()
          }}
          onResize={syncSize}
          style={{ display: videoFile ? 'block' : 'none' }}
        />

        {/* Drag overlay to catch mouse events for the top portion of the video, leaving the bottom 60px free for native controls */}
        {videoFile && (
          <div 
            className="drag-overlay"
            onMouseDown={onDown}
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: '60px',
              cursor: (watermark.animation === 'bounce' || watermark.animation === 'slide') ? 'default' : 'crosshair',
              zIndex: 10
            }}
          />
        )}

        {/* Canvas — always present; absolute over video when loaded, standalone otherwise */}
        <canvas
          ref={canvasRef}
          className={`preview-canvas${videoFile ? '' : ' placeholder'}`}
          onMouseDown={!videoFile ? onDown : undefined}
          style={{ 
            pointerEvents: videoFile ? 'none' : 'auto',
            cursor: (watermark.animation === 'bounce' || watermark.animation === 'slide') ? 'default' : 'crosshair' 
          }}
        />

        <div className="preview-controls">
          {watermark.animation === 'bounce' || watermark.animation === 'slide'
            ? <span>🚀 Spatial animation active</span>
            : <span>🖱 Drag on canvas to reposition watermark</span>
          }
        </div>
      </div>
    </div>
  )
}
