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
                          data.forEach(item => {
                              settings[item.setting_key] = item.setting_value
                                })
                                  return settings
                                  }

                                  // 특정 설정값 하나 업데이트
                                  export async function updateSetting(key, value) {
                                    const { error } = await supabase
                                        .from('site_settings')
                                            .update({ setting_value: String(value), updated_at: new Date().toISOString() })
                                                .eq('setting_key', key)
                                                  if (error) console.error('updateSetting error:', error)
                                                    return !error
                                                    }

                                                    // 여러 설정값 한번에 업데이트
                                                    export async function updateSettings(settingsObj) {
                                                      const updates = Object.entries(settingsObj).map(([key, value]) =>
                                                          supabase
                                                                .from('site_settings')
                                                                      .update({ setting_value: String(value), updated_at: new Date().toISOString() })
                                                                            .eq('setting_key', key)
                                                                              )
                                                                                await Promise.all(updates)
                                                                                }
