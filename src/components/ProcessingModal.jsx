import { useEffect, useState } from 'react'

export default function ProcessingModal({ isVisible, stage, progress, currentVideo, batchCurrent, batchTotal, onCancel }) {
  const [dots, setDots] = useState('.')

  useEffect(() => {
    if (!isVisible) return
    const id = setInterval(() => {
      setDots(d => d.length >= 3 ? '.' : d + '.')
    }, 400)
    return () => clearInterval(id)
  }, [isVisible])

  if (!isVisible) return null

  // Ensure progress is between 0 and 100
  const safeProgress = Math.min(100, Math.max(0, isNaN(progress) ? 0 : progress))

  return (
    <div className="modal-backdrop" style={{ zIndex: 9999 }}>
      <div className="modal" style={{ textAlign: 'center', padding: '40px 32px' }}>
        <div className="ffmpeg-loading-icon" style={{ margin: '0 auto 24px', animation: 'pulse 1.5s ease-in-out infinite' }}>
          ⏳
        </div>
        
        <div className="modal-title" style={{ fontSize: 22, marginBottom: 8 }}>
          {safeProgress === 100 ? 'Finishing up' : 'Processing Video'}
          {batchTotal > 1 && batchCurrent ? ` (${batchCurrent} of ${batchTotal})` : ''}
          {safeProgress < 100 ? dots : ''}
        </div>
        
        {currentVideo && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentVideo}
          </div>
        )}

        <div style={{ background: 'var(--bg-input)', borderRadius: 99, height: 6, overflow: 'hidden', marginBottom: 12 }}>
          <div 
            style={{ 
              height: '100%', 
              background: 'var(--gradient-accent)', 
              width: `${safeProgress}%`,
              transition: 'width 0.3s ease-out'
            }} 
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 32 }}>
          <span>{stage || 'Initializing...'}</span>
          <span style={{ fontFamily: "'Space Grotesk', monospace", color: 'var(--text-primary)', fontWeight: 600 }}>
            {Math.round(safeProgress)}%
          </span>
        </div>

        {onCancel && (
          <button className="btn btn-secondary btn-full" onClick={onCancel}>
            Cancel Processing
          </button>
        )}
      </div>
    </div>
  )
}
