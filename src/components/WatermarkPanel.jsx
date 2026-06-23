import { useRef, useState } from 'react'

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

function AccordionSection({ title, id, openId, onToggle, children }) {
  const isOpen = openId === id
  return (
    <div className="panel-section">
      <div 
        className="panel-section-title" 
        style={{ cursor: 'pointer', marginBottom: isOpen ? 16 : 0, userSelect: 'none', transition: 'margin 0.2s' }} 
        onClick={() => onToggle(id)}
      >
        <span>{title}</span>
        <span style={{ fontSize: 10, opacity: 0.5, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </div>
      {isOpen && <div style={{ animation: 'fadeIn 0.2s ease' }}>{children}</div>}
    </div>
  )
}

export default function WatermarkPanel({ watermark, onChange, onWmImageLoad }) {
  const fileRef = useRef(null)
  const [openSection, setOpenSection] = useState('content') // 'content', 'export', 'appearance', 'animation', 'position'

  const set = (key, val) => onChange({ ...watermark, [key]: val })
  
  const toggleSection = (id) => {
    setOpenSection(prev => prev === id ? null : id)
  }

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
      <div style={{ padding: '20px 20px 0' }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Watermark Settings</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Customize your brand overlay</p>
      </div>

      <AccordionSection title="Content" id="content" openId={openSection} onToggle={toggleSection}>
        <div className="form-row" style={{ marginBottom: 16 }}>
          <div className="type-switch">
            <button className={`type-switch-btn ${watermark.type === 'text'  ? 'active' : ''}`} onClick={() => set('type', 'text')}>✏️ Text</button>
            <button className={`type-switch-btn ${watermark.type === 'image' ? 'active' : ''}`} onClick={() => set('type', 'image')}>🖼 Image</button>
          </div>
        </div>

        {watermark.type === 'text' ? (
          <>
            <div className="form-row">
              <label htmlFor="wm-text-input" className="form-label">Text</label>
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
              <label htmlFor="wm-font-select" className="form-label">Font</label>
              <select id="wm-font-select" className="form-select" value={watermark.fontFamily || 'Inter'} onChange={e => set('fontFamily', e.target.value)}>
                {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
              </select>
            </div>
            <div className="form-row-inline">
              <div className="form-row" style={{ flex: 1 }}>
                <label htmlFor="wm-fontsize-slider" className="form-label">Size <span className="form-label-value">{watermark.fontSize ?? 5}%</span></label>
                <input id="wm-fontsize-slider" type="range" min="1" max="20" step="0.5" className="form-range"
                  value={watermark.fontSize ?? 5} onChange={e => set('fontSize', Number(e.target.value))} />
              </div>
              <div className="form-row" style={{ alignItems: 'center' }}>
                <label htmlFor="wm-color-picker" className="form-label">Color</label>
                <input id="wm-color-picker" type="color" className="form-color"
                  value={watermark.color || '#ffffff'} onChange={e => set('color', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Style</label>
              <div className="font-toggles" style={{ flexWrap: 'wrap' }}>
                <button id="wm-bold-btn" aria-label="Bold" className={`font-toggle-btn ${watermark.bold ? 'active' : ''}`} onClick={() => set('bold', !watermark.bold)} title="Bold">B</button>
                <button id="wm-italic-btn" aria-label="Italic" className={`font-toggle-btn ${watermark.italic ? 'active' : ''}`} onClick={() => set('italic', !watermark.italic)} title="Italic" style={{ fontStyle: 'italic' }}>I</button>
                <button id="wm-underline-btn" aria-label="Underline" className={`font-toggle-btn ${watermark.underline ? 'active' : ''}`} onClick={() => set('underline', !watermark.underline)} title="Underline" style={{ textDecoration: 'underline' }}>U</button>
                <button id="wm-shadow-btn" aria-label="Shadow" className={`font-toggle-btn ${watermark.shadow ? 'active' : ''}`} onClick={() => set('shadow', !watermark.shadow)} title="Drop Shadow">💧</button>
                <button id="wm-glow-btn" aria-label="Glow" className={`font-toggle-btn ${watermark.glow ? 'active' : ''}`} onClick={() => set('glow', !watermark.glow)} title="Neon Glow">🌟</button>
                <button id="wm-outline-btn" aria-label="Outline" className={`font-toggle-btn ${watermark.outline ? 'active' : ''}`} onClick={() => set('outline', !watermark.outline)} title="Stroke Outline">Ⓐ</button>
                <button id="wm-bgbox-btn" aria-label="Background Box" className={`font-toggle-btn ${watermark.bgBox ? 'active' : ''}`} onClick={() => set('bgBox', !watermark.bgBox)} title="Background Box">🔲</button>
              </div>
            </div>

            <div className="form-row">
              <label htmlFor="wm-letterspacing-slider" className="form-label">Letter Spacing <span className="form-label-value">{watermark.letterSpacing ?? 0}px</span></label>
              <input id="wm-letterspacing-slider" type="range" min="-10" max="100" step="1" className="form-range"
                value={watermark.letterSpacing ?? 0} onChange={e => set('letterSpacing', Number(e.target.value))} />
            </div>

            {watermark.bgBox && (
              <div className="form-row">
                <label className="form-label">Box Background</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="color" className="form-color"
                    value={(watermark.bgColor || 'rgba(0,0,0,0.6)').slice(0, 7)} 
                    onChange={e => set('bgColor', e.target.value)} 
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Solid color only for now</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <input ref={fileRef} type="file" accept="image/png, image/jpeg, image/webp" style={{ display: 'none' }} onChange={handleImageUpload} id="wm-image-upload" />
            {watermark.imageData ? (
              <div className="form-row">
                <img src={watermark.imageData} alt="Watermark" className="img-preview-thumb" />
                <button className="btn btn-secondary btn-sm btn-full" style={{ marginTop: 12 }} onClick={() => fileRef.current?.click()}>🔄 Replace Image</button>
              </div>
            ) : (
              <div className="img-upload-btn" onClick={() => fileRef.current?.click()}>
                <span style={{ fontSize: 24 }}>🖼</span>
                <span>Click to upload logo or image<br /><small style={{ opacity: 0.6 }}>PNG with transparency recommended</small></span>
              </div>
            )}
            <div className="form-row" style={{ marginTop: 16 }}>
              <label htmlFor="wm-img-scale-slider" className="form-label">Size <span className="form-label-value">{watermark.scale ?? 100}%</span></label>
              <input id="wm-img-scale-slider" type="range" min="10" max="300" step="1" className="form-range"
                value={watermark.scale ?? 100} onChange={e => set('scale', Number(e.target.value))} />
            </div>
          </>
        )}
      </AccordionSection>

      <AccordionSection title="Appearance" id="appearance" openId={openSection} onToggle={toggleSection}>
        <div className="form-row">
          <label htmlFor="wm-opacity-slider" className="form-label">Opacity <span className="form-label-value">{watermark.opacity ?? 100}%</span></label>
          <input id="wm-opacity-slider" type="range" min="0" max="100" step="1" className="form-range"
            value={watermark.opacity ?? 100} onChange={e => set('opacity', Number(e.target.value))} />
        </div>
        <div className="form-row">
          <label htmlFor="wm-rotation-slider" className="form-label">Rotation <span className="form-label-value">{watermark.rotation ?? 0}°</span></label>
          <input id="wm-rotation-slider" type="range" min="-180" max="180" step="1" className="form-range"
            value={watermark.rotation ?? 0} onChange={e => set('rotation', Number(e.target.value))} />
        </div>
      </AccordionSection>

      <AccordionSection title="Animation" id="animation" openId={openSection} onToggle={toggleSection}>
        <div className="form-row">
          <label className="form-label">Effect</label>
          <div className="type-switch" style={{ flexWrap: 'wrap', gap: 4 }}>
            <button className={`type-switch-btn ${watermark.animation === 'none' ? 'active' : ''}`} onClick={() => set('animation', 'none')} style={{ flex: '1 0 30%' }}>🚫 None</button>
            <button className={`type-switch-btn ${watermark.animation === 'bounce' ? 'active' : ''}`} onClick={() => set('animation', 'bounce')} style={{ flex: '1 0 30%' }}>🏀 Bounce</button>
            <button className={`type-switch-btn ${watermark.animation === 'slide' ? 'active' : ''}`} onClick={() => set('animation', 'slide')} style={{ flex: '1 0 30%' }}>↔️ Slide</button>
            <button className={`type-switch-btn ${watermark.animation === 'pulse' ? 'active' : ''}`} onClick={() => set('animation', 'pulse')} style={{ flex: '1 0 30%' }}>💓 Pulse</button>
            <button className={`type-switch-btn ${watermark.animation === 'spin' ? 'active' : ''}`} onClick={() => set('animation', 'spin')} style={{ flex: '1 0 30%' }}>🌀 Spin</button>
            <button className={`type-switch-btn ${watermark.animation === 'fade' ? 'active' : ''}`} onClick={() => set('animation', 'fade')} style={{ flex: '1 0 30%' }}>👻 Fade</button>
            <button className={`type-switch-btn ${watermark.animation === 'float' ? 'active' : ''}`} onClick={() => set('animation', 'float')} style={{ flex: '1 0 30%' }}>🎈 Float</button>
            <button className={`type-switch-btn ${watermark.animation === 'shake' ? 'active' : ''}`} onClick={() => set('animation', 'shake')} style={{ flex: '1 0 30%' }}>🫨 Shake</button>
            <button className={`type-switch-btn ${watermark.animation === 'zoom' ? 'active' : ''}`} onClick={() => set('animation', 'zoom')} style={{ flex: '1 0 30%' }}>🔍 Zoom</button>
          </div>
        </div>
        {watermark.animation && watermark.animation !== 'none' && (
          <div className="form-row" style={{ marginTop: 12 }}>
            <label htmlFor="wm-anim-speed-slider" className="form-label">Speed <span className="form-label-value">{watermark.animSpeed ?? 5}</span></label>
            <input id="wm-anim-speed-slider" type="range" min="1" max="10" step="0.5" className="form-range"
              value={watermark.animSpeed ?? 5} onChange={e => set('animSpeed', Number(e.target.value))} />
          </div>
        )}
      </AccordionSection>

      <AccordionSection title="Position" id="position" openId={openSection} onToggle={toggleSection}>
        <div className="form-row">
          <label htmlFor="wm-x-slider" className="form-label">X (horizontal) <span className="form-label-value">{Math.round(watermark.xPct ?? 50)}%</span></label>
          <input id="wm-x-slider" type="range" min="0" max="100" step="0.5" className="form-range"
            value={watermark.xPct ?? 50} onChange={e => set('xPct', Number(e.target.value))} />
        </div>
        <div className="form-row">
          <label htmlFor="wm-y-slider" className="form-label">Y (vertical) <span className="form-label-value">{Math.round(watermark.yPct ?? 50)}%</span></label>
          <input id="wm-y-slider" type="range" min="0" max="100" step="0.5" className="form-range"
            value={watermark.yPct ?? 50} onChange={e => set('yPct', Number(e.target.value))} />
        </div>
        <div className="form-row" style={{ marginTop: 12 }}>
          <label className="form-label">Quick Position</label>
          <div className="position-grid">
            {POSITION_PRESETS.map(p => (
              <button
                key={p.label}
                aria-label={`Position ${p.label}`}
                className={`position-btn ${watermark.xPct === p.xPct && watermark.yPct === p.yPct ? 'active' : ''}`}
                onClick={() => onChange({ ...watermark, xPct: p.xPct, yPct: p.yPct })}
                title={`Position: ${p.label}`}
              >{p.label}</button>
            ))}
          </div>
        </div>
      </AccordionSection>
      
      <AccordionSection title="Output Format" id="export" openId={openSection} onToggle={toggleSection}>
        <div className="form-row">
          <label htmlFor="wm-ratio-select" className="form-label">Output Aspect Ratio</label>
          <select id="wm-ratio-select" className="form-select" value={watermark.outputRatio || 'original'} onChange={e => set('outputRatio', e.target.value)}>
            <option value="original">Original (No Padding)</option>
            <option value="1:1">1:1 (Square)</option>
            <option value="4:5">4:5 (Instagram Feed)</option>
            <option value="9:16">9:16 (Stories / Reels / TikTok)</option>
            <option value="16:9">16:9 (YouTube)</option>
          </select>
        </div>
      </AccordionSection>
    </>
  )
}
