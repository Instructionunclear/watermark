import { useState, useCallback, useEffect, useRef } from 'react'
import VideoPreview from './components/VideoPreview'
import WatermarkPanel from './components/WatermarkPanel'
import PresetManager from './components/PresetManager'
import VideoQueue from './components/VideoQueue'
import ProcessingModal from './components/ProcessingModal'
import JSZip from 'jszip'
import { usePresets } from './hooks/usePresets'
import { useFFmpeg } from './hooks/useFFmpeg'

const DEFAULT_WATERMARK = {
  type: 'text',
  text: 'My Watermark',
  fontFamily: 'Inter',
  fontSize: 5,
  color: '#ffffff',
  bold: false,
  italic: false,
  shadow: true,
  outline: false,
  opacity: 80,
  scale: 100,
  rotation: 0,
  xPct: 50,
  yPct: 50,
  imageData: null,
  animation: 'none',
  animSpeed: 5,
  outputRatio: 'original',
}

function useToasts() {
  const [toasts, setToasts] = useState([])
  const counter = useRef(0)
  const addToast = useCallback((msg, type = 'info') => {
    const id = ++counter.current
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])
  return { toasts, addToast }
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('wm_theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('wm_theme', theme)
  }, [theme])

  const [watermark, setWatermark] = useState(DEFAULT_WATERMARK)
  const [wmImage, setWmImage] = useState(null)
  const [videos, setVideos] = useState([])
  const [activeIndex, setActiveIndex] = useState(null)
  const [progress, setProgress] = useState({})
  const [processingIndex, setProcessingIndex] = useState(null)
  const [processingStage, setProcessingStage] = useState('')
  const [downloadURLs, setDownloadURLs] = useState({})
  const [activePreset, setActivePreset] = useState(null)
  const [isProcessingAll, setIsProcessingAll] = useState(false)

  const { presets, save: savePreset, remove: removePreset } = usePresets()
  const { ffmpegLoaded, ffmpegLoading, load: loadFFmpeg, processVideo } = useFFmpeg()
  const { toasts, addToast } = useToasts()

  useEffect(() => { loadFFmpeg() }, [loadFFmpeg])

  const handleAddVideos = useCallback((newFiles) => {
    setVideos(prev => {
      const updated = [...prev, ...newFiles]
      if (prev.length === 0 && newFiles.length > 0) setActiveIndex(0)
      return updated
    })
    addToast(`Added ${newFiles.length} video${newFiles.length > 1 ? 's' : ''}`, 'success')
  }, [addToast])

  const handleRemoveVideo = useCallback((i) => {
    setVideos(prev => {
      const next = prev.filter((_, idx) => idx !== i)
      setActiveIndex(ai => {
        if (next.length === 0) return null
        if (ai === null) return null
        if (ai === i) return Math.min(ai, next.length - 1)
        if (ai > i) return ai - 1
        return ai
      })
      return next
    })
    setProgress(p => {
      const n = {}
      Object.entries(p).forEach(([k, v]) => {
        const ki = Number(k)
        if (ki < i) n[ki] = v
        else if (ki > i) n[ki - 1] = v
      })
      return n
    })
    setDownloadURLs(d => {
      const n = {}
      Object.entries(d).forEach(([k, v]) => {
        const ki = Number(k)
        if (ki < i) n[ki] = v
        else if (ki > i) n[ki - 1] = v
      })
      return n
    })
  }, [])

  const handleClearAll = useCallback(() => {
    setVideos([])
    setActiveIndex(null)
    setProgress({})
    setDownloadURLs({})
    addToast('Queue cleared', 'info')
  }, [addToast])

  const handleClearDone = useCallback(() => {
    let clearedCount = 0
    setVideos(prev => {
      const remaining = []
      const newProgress = {}
      const newURLs = {}
      let newActiveIndex = null
      
      prev.forEach((v, i) => {
        if (progress[i] !== 100) {
          const newIdx = remaining.length
          remaining.push(v)
          if (progress[i]) newProgress[newIdx] = progress[i]
          if (downloadURLs[i]) newURLs[newIdx] = downloadURLs[i]
          if (activeIndex === i) newActiveIndex = newIdx
        } else {
          clearedCount++
        }
      })
      
      setProgress(newProgress)
      setDownloadURLs(newURLs)
      setActiveIndex(newActiveIndex !== null ? newActiveIndex : (remaining.length > 0 ? 0 : null))
      return remaining
    })
    if (clearedCount > 0) addToast(`Cleared ${clearedCount} finished video${clearedCount > 1 ? 's' : ''}`, 'info')
  }, [activeIndex, progress, downloadURLs, addToast])

  const handleWatermarkMove = useCallback((xPct, yPct) => setWatermark(w => ({ ...w, xPct, yPct })), [])
  const handleWmImageLoad   = useCallback((img) => setWmImage(img), [])

  const handleLoadPreset = useCallback((config) => {
    setWatermark({ ...DEFAULT_WATERMARK, ...config })
    if (config.imageData) {
      const img = new Image()
      img.onload = () => setWmImage(img)
      img.src = config.imageData
    } else {
      setWmImage(null)
    }
    addToast('Preset loaded!', 'success')
  }, [addToast])

  const handleSavePreset = useCallback((name, config) => {
    try {
      savePreset(name, config)
      addToast(`Preset "${name}" saved!`, 'success')
    } catch (err) {
      addToast(err.message, 'error')
    }
  }, [savePreset, addToast])

  const processOne = useCallback(async (idx, autoDownload = true) => {
    if (!ffmpegLoaded) { addToast('FFmpeg is still loading...', 'error'); return }
    const file = videos[idx]
    if (!file) return
    setProcessingIndex(idx)
    setProcessingStage('Reading file…')
    setProgress(p => ({ ...p, [idx]: 1 }))
    try {
      const url = await processVideo(
        file,
        watermark,
        (pct, stage) => {
          if (stage) setProcessingStage(stage)
          setProgress(p => ({ ...p, [idx]: pct }))
        }
      )
      setDownloadURLs(d => ({ ...d, [idx]: url }))
      setProgress(p => ({ ...p, [idx]: 100 }))
      setProcessingStage('')
      addToast(`✅ ${file.name} done!`, 'success')
      if (autoDownload) {
        const a = document.createElement('a')
        a.href = url
        a.download = `watermarked_${file.name.replace(/\.[^.]+$/, '')}.mp4`
        a.click()
      }
      return url
    } catch (err) {
      console.error(err)
      let msg
      if (err instanceof Error) msg = err.message
      else if (err && err.name === 'ErrnoError') msg = `FS Error ${err.errno}`
      else if (typeof err === 'string') msg = err
      else if (err && err.message) msg = err.message
      else msg = JSON.stringify(err) || String(err) || 'Unknown error'
      addToast(`Error: ${msg}`, 'error')
      setProgress(p => ({ ...p, [idx]: 0 }))
      setProcessingStage('')
    } finally {
      setProcessingIndex(null)
    }
  }, [ffmpegLoaded, videos, watermark, processVideo, addToast])

  const processAll = useCallback(async () => {
    if (!ffmpegLoaded) { addToast('FFmpeg is still loading...', 'error'); return }
    if (videos.length === 0) { addToast('Add some videos first!', 'info'); return }
    setIsProcessingAll(true)
    
    const zip = new JSZip()
    const folder = zip.folder('Watermarked Videos')
    let added = 0
    
    for (let i = 0; i < videos.length; i++) {
      const url = await processOne(i, false) // Disable auto-download for individual files
      if (url) {
        try {
          const res = await fetch(url)
          const blob = await res.blob()
          const name = `watermarked_${videos[i].name.replace(/\.[^.]+$/, '')}.mp4`
          folder.file(name, blob)
          added++
        } catch (err) {
          console.error('Failed to fetch blob for zip', err)
        }
      }
    }
    
    setIsProcessingAll(false)
    addToast(`🎉 All ${videos.length} videos done!`, 'success')
    
    if (added > 0) {
      addToast('Generating ZIP file...', 'info')
      try {
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        const url = URL.createObjectURL(zipBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'Watermarked_Videos.zip'
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      } catch {
        addToast('Failed to create ZIP', 'error')
      }
    }
  }, [ffmpegLoaded, videos, processOne, addToast])

  const handleDownloadZIP = useCallback(async () => {
    const zip = new JSZip()
    const folder = zip.folder('Watermarked Videos')
    
    let added = 0
    for (let i = 0; i < videos.length; i++) {
      if (downloadURLs[i]) {
        try {
          const res = await fetch(downloadURLs[i])
          const blob = await res.blob()
          const name = `watermarked_${videos[i].name.replace(/\.[^.]+$/, '')}.mp4`
          folder.file(name, blob)
          added++
        } catch (err) {
          console.error('Failed to fetch blob for zip', err)
        }
      }
    }
    
    if (added === 0) {
      addToast('No exported videos to download!', 'error')
      return
    }
    
    addToast('Generating ZIP file...', 'info')
    try {
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'Watermarked_Videos.zip'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      addToast('Failed to create ZIP', 'error')
    }
  }, [videos, downloadURLs, addToast])

  const doneCount = Object.values(progress).filter(v => v === 100).length

  if (ffmpegLoading) {
    return (
      <div className="ffmpeg-loading">
        <div className="ffmpeg-loading-icon">🎬</div>
        <div className="ffmpeg-loading-title">Watermark Studio</div>
        <div className="ffmpeg-loading-sub">Loading the video processing engine…<br/>This only happens once.</div>
        <div className="ffmpeg-loading-bar"><div className="ffmpeg-loading-bar-fill" /></div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Downloading FFmpeg WASM (~10 MB)</div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-brand">
          <div className="header-brand-icon">🎬</div>
          Watermark Studio
        </div>
        <div className="header-actions">
          {videos.length === 0 && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              title="Toggle Light/Dark Mode"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          )}
          {doneCount > 0 && (
            <span className="badge badge-success">✅ {doneCount}/{videos.length} exported</span>
          )}
          {!ffmpegLoaded && <span className="badge badge-warning">⏳ Loading engine…</span>}
          {ffmpegLoaded && videos.length === 0 && (
            <span className="badge badge-success" style={{ fontSize: 10 }}>✅ Engine ready</span>
          )}
          {videos.length > 0 && (
            <>
              {doneCount > 0 && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleDownloadZIP}
                  title="Download all finished videos as a ZIP file"
                >
                  📦 Download ZIP
                </button>
              )}
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                title="Toggle Light/Dark Mode"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <button
                id="process-single-btn"
                className="btn btn-secondary btn-sm"
                onClick={() => activeIndex !== null && processOne(activeIndex)}
                disabled={activeIndex === null || processingIndex !== null || !ffmpegLoaded}
                title="Export the currently selected video"
              >
                ⚡ Export Current
              </button>
              <button
                id="process-all-btn"
                className="btn btn-primary btn-sm"
                onClick={processAll}
                disabled={isProcessingAll || !ffmpegLoaded}
                title="Export all videos in the queue"
              >
                🚀 Export All ({videos.length})
              </button>
            </>
          )}
        </div>
      </header>

      <VideoPreview
        videoFile={activeIndex !== null ? videos[activeIndex] : null}
        watermark={watermark}
        onWatermarkMove={handleWatermarkMove}
        wmImage={wmImage}
      />

      {/* Single side-panel — WatermarkPanel renders fragment sections directly inside */}
      <div className="side-panel">
        <WatermarkPanel
          watermark={watermark}
          onChange={setWatermark}
          onWmImageLoad={handleWmImageLoad}
        />
        <PresetManager
          presets={presets}
          watermark={watermark}
          onLoad={handleLoadPreset}
          onSave={handleSavePreset}
          onDelete={removePreset}
          activePreset={activePreset}
          onSetActive={setActivePreset}
        />
      </div>

      <VideoQueue
        videos={videos}
        activeIndex={activeIndex}
        onSelect={setActiveIndex}
        onAdd={handleAddVideos}
        onRemove={handleRemoveVideo}
        onClearAll={handleClearAll}
        onClearDone={handleClearDone}
        progress={progress}
        processingIndex={processingIndex}
        downloadURLs={downloadURLs}
      />

      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>
        ))}
      </div>

      <ProcessingModal
        isVisible={processingIndex !== null || isProcessingAll}
        stage={processingStage}
        progress={processingIndex !== null ? progress[processingIndex] : 0}
        currentVideo={processingIndex !== null && videos[processingIndex] ? videos[processingIndex].name : null}
        batchCurrent={isProcessingAll && processingIndex !== null ? processingIndex + 1 : null}
        batchTotal={isProcessingAll ? videos.length : null}
      />
    </div>
  )
}
