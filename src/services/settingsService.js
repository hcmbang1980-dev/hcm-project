import { supabase } from '../lib/supabase'

// site_settings 테이블 구조 (컬럼형)
// id=1 행 하나로 관리
// 컬럼: chat_position, chat_visible, hero_layout, stats_visible, notice_visible, banner_visible, main_sections_order
// + 어드민에서 추가하는 chat_enabled, chat_right, chat_bottom, chat_width, chat_height

export async function getSettings() {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .single()
  if (error || !data) {
    console.error('getSettings error:', error)
    return {}
  }
  // 컬럼형 데이터를 key/value 객체로 변환
  const settings = {}
  Object.keys(data).forEach(key => {
    if (key !== 'id' && key !== 'updated_at') {
      // boolean은 문자열로 변환
      settings[key] = data[key] !== null && data[key] !== undefined
        ? String(data[key])
        : undefined
    }
  })
  return settings
}

export async function updateSettings(settingsObj) {
  // 객체를 컬럼형으로 변환
  const row = { id: 1, updated_at: new Date().toISOString() }
  
  // 허용된 컬럼만 매핑
  const allowedKeys = [
    'chat_enabled', 'chat_position', 'chat_visible',
    'chat_right', 'chat_bottom', 'chat_width', 'chat_height',
    'stats_visible', 'notice_visible', 'banner_visible',
    'hero_layout', 'main_sections_order'
  ]
  
  Object.entries(settingsObj).forEach(([key, value]) => {
    if (allowedKeys.includes(key)) {
      // boolean 컬럼 처리
      if (key === 'chat_visible' || key === 'stats_visible' || 
          key === 'notice_visible' || key === 'banner_visible') {
        row[key] = value === 'true' || value === true
      } else if (key === 'chat_right' || key === 'chat_bottom' || 
                 key === 'chat_width' || key === 'chat_height') {
        row[key] = parseInt(value) || 0
      } else {
        row[key] = value
      }
    }
  })
  
  const { error } = await supabase
    .from('site_settings')
    .upsert(row, { onConflict: 'id' })
  
  if (error) {
    console.error('updateSettings error:', error)
    throw error
  }
  return true
}

export async function updateSetting(key, value) {
  return updateSettings({ [key]: value })
}
