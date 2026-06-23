import { useState, useRef, useCallback } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { drawWatermark, getWatermarkBounds } from '../utils/canvasRenderer'
import { applyAnimation } from '../utils/animations'

const FFMPEG_BASE = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'

export function useFFmpeg() {
  const ffmpegRef = useRef(null)
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false)
  const [ffmpegLoading, setFfmpegLoading] = useState(false)

  const load = useCallback(async () => {
    if (ffmpegRef.current || ffmpegLoading) return
    setFfmpegLoading(true)
    try {
      const ffmpeg = new FFmpeg()
      const coreURL = await toBlobURL(`${FFMPEG_BASE}/ffmpeg-core.js`, 'text/javascript')
      const wasmURL = await toBlobURL(`${FFMPEG_BASE}/ffmpeg-core.wasm`, 'application/wasm')
      await ffmpeg.load({ coreURL, wasmURL })
      ffmpeg.on('log', ({ message }) => console.log('[FFmpeg]', message))
      ffmpegRef.current = ffmpeg
      setFfmpegLoaded(true)
    } catch (e) {
      console.error('FFmpeg load failed:', e)
    } finally {
      setFfmpegLoading(false)
    }
  }, [ffmpegLoading])

  /**
   * Process a single video file with a watermark config.
   * Strategy:
   *   1. Use a hidden <video> + <canvas> to composite the watermark onto every frame.
   *   2. Capture the canvas stream with MediaRecorder to produce a webm blob.
   *   3. Run FFmpeg to remux webm → mp4 (so the download is universally compatible).
   */
  const processVideo = useCallback(async (file, watermarkConfig, onProgress) => {
    // ── Step 1: load the watermark image if needed ──────────────────────────
    let wmImage = null
    if (watermarkConfig.type === 'image' && watermarkConfig.imageData) {
      wmImage = await new Promise((resolve) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = watermarkConfig.imageData
      })
    }

    let progressHandler = null

    try {
      // ── Step 2: Extract metadata using a temporary blob URL ──────────────────
      const videoURL = URL.createObjectURL(file)
      const video = document.createElement('video')
      video.src = videoURL

      let duration = 1
      let vw = 1280
      let vh = 720
      let origRatio = 16 / 9

      try {
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = resolve
          video.onerror = () => reject(new Error('Failed to load video metadata'))
        })
        duration = video.duration || 1
        const origW = video.videoWidth || 1280
        const origH = video.videoHeight || 720

        origRatio = origW / origH
        let targetRatio = origRatio

        const r = watermarkConfig.outputRatio
        if (r === '1:1') targetRatio = 1
        else if (r === '4:5') targetRatio = 4 / 5
        else if (r === '16:9') targetRatio = 16 / 9
        else if (r === '9:16') targetRatio = 9 / 16

        vw = origW
        vh = origH

        if (r && r !== 'original') {
          if (origRatio > targetRatio) {
            vh = Math.round(origW / targetRatio)
          } else {
            vw = Math.round(origH * targetRatio)
          }
        }
      } finally {
        URL.revokeObjectURL(videoURL)
      }

    // ── Step 3: Set up Canvas for Watermark Generation ONLY ──────────────────
    const MAX_DIM = 1280
    if (vw > MAX_DIM || vh > MAX_DIM) {
      const ratio = Math.min(MAX_DIM / vw, MAX_DIM / vh)
      vw = Math.round(vw * ratio)
      vh = Math.round(vh * ratio)
    }

    if (vw % 2 !== 0) vw -= 1
    if (vh % 2 !== 0) vh -= 1

    const canvas = document.createElement('canvas')
    canvas.width = vw
    canvas.height = vh
    const ctx = canvas.getContext('2d')

    if (!ffmpegRef.current) throw new Error('FFmpeg not loaded')
    const ffmpeg = ffmpegRef.current

    let lastLogs = []
    const logHandler = ({ message }) => {
      lastLogs.push(message)
      if (lastLogs.length > 20) lastLogs.shift()
    }
    ffmpeg.on('log', logHandler)

    onProgress(5, 'Reading file into engine…')
    await ffmpeg.writeFile('orig.mp4', await fetchFile(file))

    // ── Step 4: Generate Transparent Watermark Overlay ───────────────────────
    // We completely bypass Safari video extraction bugs by only generating the watermark!
    const fps = 24
    const isAnimated = watermarkConfig.animation && watermarkConfig.animation !== 'none'
    const totalFrames = isAnimated ? Math.ceil(duration * fps) : 1

    onProgress(10, isAnimated ? `Generating ${totalFrames} watermark frames…` : 'Generating watermark…')

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      ctx.clearRect(0, 0, vw, vh)
      const t = frameIndex / fps
      const wmConfig = { ...watermarkConfig, origRatio }
      const bounds = getWatermarkBounds(ctx, canvas, wmConfig, wmImage)
      const frameConfig = isAnimated ? applyAnimation(wmConfig, t, bounds) : wmConfig
      
      drawWatermark(ctx, canvas, frameConfig, wmImage)
      
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'))
      
      if (totalFrames === 1) {
        await ffmpeg.writeFile('wm.png', await fetchFile(blob))
      } else {
        const outName = `wm_${String(frameIndex + 1).padStart(5, '0')}.png`
        await ffmpeg.writeFile(outName, await fetchFile(blob))
      }

      if (frameIndex % 10 === 0) {
        const framePct = 10 + Math.round((frameIndex / totalFrames) * 20)
        onProgress(framePct, `Generating watermark frame ${frameIndex + 1}/${totalFrames}…`)
        await new Promise(r => setTimeout(r, 0)) // Yield to UI
      }
    }

    // ── Step 5: Native FFmpeg Overlay Pass ───────────────────────────────
    onProgress(30, 'Encoding video…')
    progressHandler = ({ progress }) => {
      const pct = 30 + Math.round(progress * 70)
      onProgress(pct, `Encoding… ${Math.round(progress * 100)}%`)
    }
    ffmpeg.on('progress', progressHandler)

    const inputArgs = totalFrames === 1 
      ? ['-i', 'wm.png'] 
      : ['-framerate', String(fps), '-i', 'wm_%05d.png']

    lastLogs = []
    const finalRet = await ffmpeg.exec([
      '-i', 'orig.mp4',
      ...inputArgs,
      '-filter_complex', `[0:v]scale=${vw}:${vh}:force_original_aspect_ratio=decrease,pad=${vw}:${vh}:(ow-iw)/2:(oh-ih)/2[bg];[bg][1:v]overlay=0:0:eof_action=repeat[outv]`,
      '-map', '[outv]',
      '-map', '0:a?', // Safely preserve original audio if present
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      'output.mp4'
    ])

    if (finalRet !== 0) throw new Error(`FFmpeg Encoding Failed. Logs: ${lastLogs.join(' | ')}`)

    const data = await ffmpeg.readFile('output.mp4')
    const mp4Blob = new Blob([data], { type: 'video/mp4' })

    // Cleanup memory
    try {
      await ffmpeg.deleteFile('orig.mp4').catch(()=>{})
      await ffmpeg.deleteFile('output.mp4').catch(()=>{})
      if (totalFrames === 1) {
        await ffmpeg.deleteFile('wm.png').catch(()=>{})
      } else {
        for (let i = 1; i <= totalFrames; i++) {
          await ffmpeg.deleteFile(`wm_${String(i).padStart(5, '0')}.png`).catch(()=>{})
        }
      }
    } catch {}

    onProgress(100)
    return URL.createObjectURL(mp4Blob)

  } finally {
    if (ffmpegRef.current && progressHandler) {
      ffmpegRef.current.off('progress', progressHandler)
    }
  }
  }, [])

  return { ffmpegLoaded, ffmpegLoading, load, processVideo }
}
