import React, { useState } from 'react'

export default function PresetManager({ presets, watermark, onLoad, onSave, onDelete, activePreset, onSetActive }) {
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveName, setSaveName] = useState('')

  const handleSave = () => {
    const trimmed = saveName.trim()
    if (!trimmed) return
    onSave(trimmed, { ...watermark })
    setSaveName('')
    setShowSaveModal(false)
  }

  const handleLoad = (preset) => {
    onLoad(preset.config)
    onSetActive(preset.name)
  }

  return (
    <div className="panel-section">
      <div className="panel-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
        <span>Presets</span>
        <button
          id="open-save-preset-btn"
          className="btn btn-primary btn-sm"
          onClick={() => { setSaveName(activePreset || ''); setShowSaveModal(true) }}
          title="Save current settings as a preset"
        >
          💾 Save
        </button>
      </div>
      <div style={{ marginTop: 12 }}>
        {presets.length === 0 ? (
          <div className="preset-empty">No presets yet.<br/>Customize your watermark and save it!</div>
        ) : (
          <div className="preset-list">
            {presets.map(p => (
              <div
                key={p.name}
                className={`preset-item ${activePreset === p.name ? 'active' : ''}`}
                onClick={() => handleLoad(p)}
                title={`Load preset "${p.name}"`}
              >
                <span className="preset-item-icon">
                  {p.config?.type === 'image' ? '🖼' : '✏️'}
                </span>
                <span className="preset-item-name">{p.name}</span>
                {activePreset === p.name && (
                  <span className="preset-active-badge">Active</span>
                )}
                <button
                  className="btn btn-danger btn-sm btn-icon"
                  style={{ padding: '3px 5px', flexShrink: 0, fontSize: 11 }}
                  onClick={e => { e.stopPropagation(); onDelete(p.name) }}
                  title="Delete preset"
                  id={`delete-preset-${p.name.replace(/\s/g, '-')}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="modal-backdrop" onClick={() => setShowSaveModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">💾 Save Preset</div>
            <div className="form-row">
              <label className="form-label">Preset Name</label>
              <input
                id="preset-name-input"
                className="form-input"
                autoFocus
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="e.g. My Brand Watermark"
                maxLength={50}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowSaveModal(false)}>Cancel</button>
              <button
                id="confirm-save-preset-btn"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={!saveName.trim()}
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
