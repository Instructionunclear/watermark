import React, { useRef, useState, useEffect } from 'react'

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

export default function VideoQueue({
  videos,
  activeIndex,
  onSelect,
  onAdd,
  onRemove,
  progress,
  processingIndex,
  downloadURLs = {},
}) {
  const fileRef = useRef(null)
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
            <span className="badge badge-accent" style={{ marginLeft: 8 }}>
              {videos.length}
            </span>
          )}
        </span>
        <div className="queue-header-actions">
          <button
            id="add-video-btn"
            className="btn btn-secondary btn-sm"
            onClick={() => fileRef.current?.click()}
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
          onChange={e => handleFiles(e.target.files)}
          id="video-file-input"
        />
      </div>

      <div className="queue-scroll">
        {/* Drop zone tile */}
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
              key={v.name + i}
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
                    >
                      ⬇️
                    </a>
                  )}
                  <button
                    className="queue-item-del"
                    onClick={e => { e.stopPropagation(); onRemove(i) }}
                    title="Remove video"
                  >✕</button>
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
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
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
