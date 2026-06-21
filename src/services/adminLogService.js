import { supabase } from '../lib/supabase'

const SHEET_WEBHOOK = import.meta.env.VITE_GOOGLE_SHEET_WEBHOOK

// 관리자 로그 기록 (Supabase + Google Sheet 동시)
export async function addAdminLog({ action, targetUser, telegramId, reason, adminName = '운영자' }) {
    // Supabase 기록
  await supabase.from('admin_logs').insert({
        action,
        target_user: targetUser,
        telegram_id: telegramId,
        reason,
        admin_name: adminName,
  })

  // Google Sheet 기록
  if (SHEET_WEBHOOK) {
        try {
                await fetch(SHEET_WEBHOOK, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                                      action,
                                      telegram_id: telegramId,
                                      nickname: targetUser,
                                      reason,
                                      admin: adminName,
                                      created_at: new Date().toISOString(),
                          }),
                })
        } catch (e) {
                console.error('Google Sheet log error:', e)
        }
  }
}

// 관리자 로그 목록 조회
export async function getAdminLogs(limit = 50) {
    const { data, error } = await supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) return []
        return data
}
