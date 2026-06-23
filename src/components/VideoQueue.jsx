import { useRef, useState, useEffect } from 'react'

function VideoThumb({ file }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current || !file) return
    const url = URL.createObjectURL(file)
    ref.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])
  return <video ref={ref} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
}

function formatSize(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function VideoQueue({
  videos,
  activeIndex,
  onSelect,
  onAdd,
  onRemove,
  onClearAll,
  onClearDone,
  progress,
  processingIndex,
  downloadURLs = {},
}) {
  const fileRef = useRef(null)
  const folderRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = (files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith('video/'))
    if (valid.length) onAdd(valid)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const getStatus = (i) => {
    if (progress[i] === 100) return 'done'
    if (processingIndex === i) return 'processing'
    if (progress[i] > 0) return 'processing'
    return 'idle'
  }

  const getStatusIcon = (i) => {
    const s = getStatus(i)
    if (s === 'done') return '✅'
    if (s === 'processing') return <span className="spinner" style={{ borderTopColor: 'var(--warning)' }} />
    return null
  }

  const totalSize = videos.reduce((acc, v) => acc + (v.size || 0), 0)

  return (
    <div
      className="queue-area"
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <div className="queue-header">
        <span className="queue-header-title">
          Video Queue
          {videos.length > 0 && (
            <span style={{ fontWeight: 'normal', textTransform: 'none', marginLeft: 8, fontSize: 10 }}>
              {videos.length} items ({formatSize(totalSize)})
            </span>
          )}
        </span>
        <div className="queue-header-actions">
          {videos.length > 0 && (
            <>
              {Object.values(progress).some(p => p === 100) && (
                <button className="btn btn-secondary btn-sm" onClick={onClearDone}>
                  ✨ Clear Done
                </button>
              )}
              <button className="btn btn-danger btn-sm" onClick={onClearAll}>
                🗑 Clear All
              </button>
            </>
          )}
          <button
            id="add-folder-btn"
            className="btn btn-secondary btn-sm"
            onClick={() => folderRef.current?.click()}
            aria-label="Add Folder"
          >
            📁 Add Folder
          </button>
          <button
            id="add-video-btn"
            className="btn btn-secondary btn-sm"
            onClick={() => fileRef.current?.click()}
            aria-label="Add Videos"
          >
            + Add Videos
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          multiple
          style={{ display: 'none' }}
          onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
          id="video-file-input"
        />
        <input
          ref={folderRef}
          type="file"
          accept="video/*"
          webkitdirectory="true"
          directory="true"
          multiple
          style={{ display: 'none' }}
          onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
          id="video-folder-input"
        />
      </div>

      <div className="queue-scroll">
        <div
          className={`drop-zone ${dragging ? 'dragging' : ''}`}
          onClick={() => fileRef.current?.click()}
          title="Add videos"
        >
          <span className="drop-zone-icon">📁</span>
          <span>Drop or click</span>
        </div>

        {videos.map((v, i) => {
          const status = getStatus(i)
          const prog = progress[i] ?? 0
          const icon = getStatusIcon(i)
          return (
            <div
              key={`${v.name}-${v.size}-${v.lastModified}-${i}`}
              className={`queue-item ${activeIndex === i ? 'active' : ''} ${status}`}
              onClick={() => onSelect(i)}
              title={v.name}
            >
              <div className="queue-thumb">
                <VideoThumb file={v} />
                {icon && (
                  <div className="queue-thumb-overlay">
                    <span className="queue-thumb-status">{icon}</span>
                  </div>
                )}
              </div>
              <div className="queue-info">
                <div className="queue-name-row">
                  <div className="queue-name">{v.name}</div>
                  {status === 'done' && downloadURLs[i] && (
                    <a
                      href={downloadURLs[i]}
                      download={`watermarked_${v.name.replace(/\.[^.]+$/, '')}.mp4`}
                      className="queue-item-dl"
                      onClick={e => e.stopPropagation()}
                      title="Download Video"
                      aria-label="Download"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </a>
                  )}
                  <button
                    className="queue-item-del"
                    onClick={e => { e.stopPropagation(); onRemove(i) }}
                    title="Remove video"
                    aria-label="Remove"
                  >✕</button>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {formatSize(v.size)}
                </div>
                <div className="queue-progress">
                  <div
                    className={`queue-progress-bar ${status === 'done' ? 'done' : ''}`}
                    style={{ width: `${prog}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}

        {videos.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '0 20px' }}>
            No videos yet — add some to get started
          </div>
        )}
      </div>

      {dragging && (
        <div className="upload-overlay">
          <div className="upload-overlay-text">📹 Drop videos here</div>
        </div>
      )}
    </div>
  )
}
