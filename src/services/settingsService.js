import { supabase } from '../lib/supabase'

// site_settings 전체 불러오기 (key/value 방식)
export async function getSettings() {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
    if (error) {
          console.error('getSettings error:', error)
          return {}
    }
    const settings = {}
        ;(data || []).forEach(item => {
          settings[item.setting_key] = item.setting_value
    })
    return settings
}

// 특정 설정값 하나 업데이트 (없으면 생성)
export async function updateSetting(key, value) {
    const { error } = await supabase
      .from('site_settings')
      .upsert(
        { setting_key: key, setting_value: String(value), updated_at: new Date().toISOString() },
        { onConflict: 'setting_key' }
            )
    if (error) console.error('updateSetting error:', error)
    return !error
}

// 여러 설정값 한번에 업데이트 (없으면 생성)
export async function updateSettings(settingsObj) {
    const rows = Object.entries(settingsObj).map(([key, value]) => ({
          setting_key: key,
          setting_value: String(value),
          updated_at: new Date().toISOString(),
    }))
    const { error } = await supabase
      .from('site_settings')
      .upsert(rows, { onConflict: 'setting_key' })
    if (error) console.error('updateSettings error:', error)
    return !error
}
