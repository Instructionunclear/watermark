import { useState, useCallback } from 'react'

const STORAGE_KEY = 'wm_studio_presets'

export function usePresets() {
  const [presets, setPresets] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch {
      return []
    }
  })

  const save = useCallback((name, config) => {
    let success = true
    let errorMsg = ''
    setPresets(prev => {
      const exists = prev.findIndex(p => p.name === name)
      let next
      if (exists !== -1) {
        next = prev.map((p, i) => i === exists ? { name, config, updatedAt: Date.now() } : p)
      } else {
        next = [...prev, { name, config, createdAt: Date.now(), updatedAt: Date.now() }]
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        return next
      } catch (err) {
        success = false
        errorMsg = err.name === 'QuotaExceededError' 
          ? 'Storage full. Try deleting other presets, or use a smaller image watermark.'
          : 'Failed to save preset.'
        return prev // rollback
      }
    })
    if (!success) throw new Error(errorMsg)
  }, [])

  const remove = useCallback((name) => {
    setPresets(prev => {
      const next = prev.filter(p => p.name !== name)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch (err) {
        console.error('Failed to update storage after removing preset', err)
      }
      return next
    })
  }, [])

  return { presets, save, remove }
}
