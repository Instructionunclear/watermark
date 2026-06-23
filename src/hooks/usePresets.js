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
    setPresets(prev => {
      const exists = prev.findIndex(p => p.name === name)
      let next
      if (exists !== -1) {
        next = prev.map((p, i) => i === exists ? { name, config, updatedAt: Date.now() } : p)
      } else {
        next = [...prev, { name, config, createdAt: Date.now(), updatedAt: Date.now() }]
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const remove = useCallback((name) => {
    setPresets(prev => {
      const next = prev.filter(p => p.name !== name)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const rename = useCallback((oldName, newName) => {
    setPresets(prev => {
      const next = prev.map(p => p.name === oldName ? { ...p, name: newName } : p)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { presets, save, remove, rename }
}
