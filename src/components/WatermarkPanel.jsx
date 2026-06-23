import React, { useRef } from 'react'

const FONTS = ['Inter', 'Arial', 'Georgia', 'Courier New', 'Impact', 'Verdana', 'Times New Roman', 'Trebuchet MS']

const POSITION_PRESETS = [
  { label: '↖', xPct: 5,  yPct: 5  },
  { label: '↑', xPct: 50, yPct: 5  },
  { label: '↗', xPct: 95, yPct: 5  },
  { label: '←', xPct: 5,  yPct: 50 },
  { label: '⊙', xPct: 50, yPct: 50 },
  { label: '→', xPct: 95, yPct: 50 },
  { label: '↙', xPct: 5,  yPct: 95 },
  { label: '↓', xPct: 50, yPct: 95 },
  { label: '↘', xPct: 95, yPct: 95 },
]

export default function WatermarkPanel({ watermark, onChange, onWmImageLoad }) {
  const fileRef = useRef(null)
  const set = (key, val) => onChange({ ...watermark, [key]: val })

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataURL = ev.target.result
      onChange({ ...watermark, type: 'image', imageData: dataURL })
      const img = new Image()
      img.onload = () => onWmImageLoad(img)
      img.src = dataURL
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <>
      {/* Panel Header */}
      <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', background: 'rgba(139,92,246,0.04)' }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
          Watermark Settings
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          Customize, position & animate
        </div>
      </div>

      {/* Type Switch */}
      <div className="panel-section">
        <div className="panel-section-title">Type</div>
        <div className="type-switch">
          <button className={`type-switch-btn ${watermark.type === 'text'  ? 'active' : ''}`} onClick={() => set('type', 'text')}>✏️ Text</button>
          <button className={`type-switch-btn ${watermark.type === 'image' ? 'active' : ''}`} onClick={() => set('type', 'image')}>🖼 Image</button>
        </div>
      </div>

      {/* Text Options */}
      {watermark.type === 'text' && (
        <div className="panel-section">
          <div className="panel-section-title">Text</div>
          <div className="form-row">
            <label className="form-label">Content</label>
            <input
              id="wm-text-input"
              className="form-input"
              value={watermark.text ?? ''}
              onChange={e => set('text', e.target.value)}
              placeholder="Your watermark text..."
              maxLength={100}
            />
          </div>
          <div className="form-row">
            <label className="form-label">Font</label>
            <select id="wm-font-select" className="form-select" value={watermark.fontFamily || 'Inter'} onChange={e => set('fontFamily', e.target.value)}>
              {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="form-row-inline">
            <div className="form-row" style={{ flex: 1 }}>
              <label className="form-label">Size <span className="form-label-value">{watermark.fontSize ?? 5}%</span></label>
              <input id="wm-fontsize-slider" type="range" min="1" max="20" step="0.5" className="form-range"
                value={watermark.fontSize ?? 5} onChange={e => set('fontSize', Number(e.target.value))} />
            </div>
            <div className="form-row" style={{ alignItems: 'center' }}>
              <label className="form-label">Color</label>
              <input id="wm-color-picker" type="color" className="form-color"
                value={watermark.color || '#ffffff'} onChange={e => set('color', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <label className="form-label">Style</label>
            <div className="font-toggles">
              <button id="wm-bold-btn"    className={`font-toggle-btn ${watermark.bold    ? 'active' : ''}`} onClick={() => set('bold',    !watermark.bold)}    title="Bold">B</button>
              <button id="wm-italic-btn"  className={`font-toggle-btn ${watermark.italic  ? 'active' : ''}`} onClick={() => set('italic',  !watermark.italic)}  title="Italic" style={{ fontStyle: 'italic' }}>I</button>
              <button id="wm-shadow-btn"  className={`font-toggle-btn ${watermark.shadow  ? 'active' : ''}`} onClick={() => set('shadow',  !watermark.shadow)}  title="Shadow">💧</button>
              <button id="wm-outline-btn" className={`font-toggle-btn ${watermark.outline ? 'active' : ''}`} onClick={() => set('outline', !watermark.outline)} title="Outline">Ⓐ</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Options */}
      {watermark.type === 'image' && (
        <div className="panel-section">
          <div className="panel-section-title">Image / Logo</div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} id="wm-image-upload" />
          {watermark.imageData ? (
            <div className="form-row">
              <img src={watermark.imageData} alt="Watermark" className="img-preview-thumb" />
              <button className="btn btn-secondary btn-sm btn-full mt-8" onClick={() => fileRef.current?.click()}>🔄 Replace Image</button>
            </div>
          ) : (
            <div className="img-upload-btn" onClick={() => fileRef.current?.click()}>
              <span style={{ fontSize: 24 }}>🖼</span>
              <span>Click to upload logo or image<br /><small style={{ opacity: 0.6 }}>PNG with transparency recommended</small></span>
            </div>
          )}
          <div className="form-row" style={{ marginTop: 10 }}>
            <label className="form-label">Size <span className="form-label-value">{watermark.scale ?? 100}%</span></label>
            <input id="wm-img-scale-slider" type="range" min="10" max="300" step="1" className="form-range"
              value={watermark.scale ?? 100} onChange={e => set('scale', Number(e.target.value))} />
          </div>
        </div>
      )}

      {/* Export Settings */}
      <div className="panel-section">
        <div className="panel-section-title">Export Settings</div>
        <div className="form-row">
          <label className="form-label">Output Aspect Ratio</label>
          <select id="wm-ratio-select" className="form-select" value={watermark.outputRatio || 'original'} onChange={e => set('outputRatio', e.target.value)}>
            <option value="original">Original (No Padding)</option>
            <option value="1:1">1:1 (Square)</option>
            <option value="4:5">4:5 (Instagram Feed)</option>
            <option value="9:16">9:16 (Stories / Reels / TikTok)</option>
            <option value="16:9">16:9 (YouTube)</option>
          </select>
        </div>
      </div>

      {/* Appearance */}
      <div className="panel-section">
        <div className="panel-section-title">Appearance</div>
        <div className="form-row">
          <label className="form-label">Opacity <span className="form-label-value">{watermark.opacity ?? 100}%</span></label>
          <input id="wm-opacity-slider" type="range" min="0" max="100" step="1" className="form-range"
            value={watermark.opacity ?? 100} onChange={e => set('opacity', Number(e.target.value))} />
        </div>
        <div className="form-row">
          <label className="form-label">Rotation <span className="form-label-value">{watermark.rotation ?? 0}°</span></label>
          <input id="wm-rotation-slider" type="range" min="-180" max="180" step="1" className="form-range"
            value={watermark.rotation ?? 0} onChange={e => set('rotation', Number(e.target.value))} />
        </div>
      </div>

      {/* Animation */}
      <div className="panel-section">
        <div className="panel-section-title">Animation</div>
        <div className="form-row">
          <label className="form-label">Effect</label>
          <div className="type-switch" style={{ flexWrap: 'wrap', gap: 4 }}>
            <button className={`type-switch-btn ${watermark.animation === 'none' ? 'active' : ''}`} onClick={() => set('animation', 'none')} style={{ flex: '1 0 30%' }}>🚫 None</button>
            <button className={`type-switch-btn ${watermark.animation === 'bounce' ? 'active' : ''}`} onClick={() => set('animation', 'bounce')} style={{ flex: '1 0 30%' }}>🏀 Bounce</button>
            <button className={`type-switch-btn ${watermark.animation === 'slide' ? 'active' : ''}`} onClick={() => set('animation', 'slide')} style={{ flex: '1 0 30%' }}>↔️ Slide</button>
            <button className={`type-switch-btn ${watermark.animation === 'pulse' ? 'active' : ''}`} onClick={() => set('animation', 'pulse')} style={{ flex: '1 0 45%' }}>💓 Pulse</button>
            <button className={`type-switch-btn ${watermark.animation === 'spin' ? 'active' : ''}`} onClick={() => set('animation', 'spin')} style={{ flex: '1 0 45%' }}>🌀 Spin</button>
          </div>
        </div>
        {watermark.animation && watermark.animation !== 'none' && (
          <div className="form-row" style={{ marginTop: 8 }}>
            <label className="form-label">Speed <span className="form-label-value">{watermark.animSpeed ?? 5}</span></label>
            <input id="wm-anim-speed-slider" type="range" min="1" max="10" step="0.5" className="form-range"
              value={watermark.animSpeed ?? 5} onChange={e => set('animSpeed', Number(e.target.value))} />
          </div>
        )}
      </div>

      {/* Position */}
      <div className="panel-section">
        <div className="panel-section-title">Position</div>
        <div className="form-row">
          <label className="form-label">X (horizontal) <span className="form-label-value">{Math.round(watermark.xPct ?? 50)}%</span></label>
          <input id="wm-x-slider" type="range" min="0" max="100" step="0.5" className="form-range"
            value={watermark.xPct ?? 50} onChange={e => set('xPct', Number(e.target.value))} />
        </div>
        <div className="form-row">
          <label className="form-label">Y (vertical) <span className="form-label-value">{Math.round(watermark.yPct ?? 50)}%</span></label>
          <input id="wm-y-slider" type="range" min="0" max="100" step="0.5" className="form-range"
            value={watermark.yPct ?? 50} onChange={e => set('yPct', Number(e.target.value))} />
        </div>
        <div className="form-row">
          <label className="form-label">Quick Position</label>
          <div className="position-grid">
            {POSITION_PRESETS.map(p => (
              <button
                key={p.label}
                className={`position-btn ${watermark.xPct === p.xPct && watermark.yPct === p.yPct ? 'active' : ''}`}
                onClick={() => onChange({ ...watermark, xPct: p.xPct, yPct: p.yPct })}
                title={`Position: ${p.label}`}
              >{p.label}</button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
