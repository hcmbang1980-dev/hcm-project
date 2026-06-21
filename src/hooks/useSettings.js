import { useState, useEffect } from 'react'
import { getSettings } from '../services/settingsService'

// site_settings를 핐으로 사용가능
let cachedSettings = null
let cacheTime = 0
const CACHE_TTL = 60 * 1000 // 1분 캐시

export function useSettings() {
    const [settings, setSettings] = useState(cachedSettings || {})
    const [loading, setLoading] = useState(!cachedSettings)

  useEffect(() => {
        const now = Date.now()
        // 캐시가 유효하면 재요청 안 함
                if (cachedSettings && (now - cacheTime) < CACHE_TTL) {
                        setSettings(cachedSettings)
                        setLoading(false)
                        return
                }
        setLoading(true)
        getSettings().then(data => {
                cachedSettings = data
                cacheTime = Date.now()
                setSettings(data)
                setLoading(false)
        })
  }, [])

  // 캐시 강제 초기화
  const refresh = async () => {
        cachedSettings = null
        cacheTime = 0
        const data = await getSettings()
        cachedSettings = data
        cacheTime = Date.now()
        setSettings(data)
  }

  return { settings, loading, refresh }
}
