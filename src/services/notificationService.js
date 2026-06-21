import { supabase } from '../lib/supabase'

// 알림 보내기
export async function sendNotification({ userId, title, message }) {
    const { error } = await supabase.from('notifications').insert({
          user_id: userId,
          title,
          message,
          is_read: false,
    })
    return !error
}

// 알림 목록 가져오기
export async function getNotifications(userId, limit = 20) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) return []
        return data
}

// 읽지 않은 알림 개수
export async function getUnreadCount(userId) {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    return count || 0
}

// 알림 읽음 처리
export async function markAsRead(notificationId) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId)
}

// 전체 읽음 처리
export async function markAllAsRead(userId) {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
}

// 실시간 알림 구독 (Supabase Realtime)
export function subscribeNotifications(userId, callback) {
    return supabase
      .channel('notifications:' + userId)
      .on('postgres_changes', {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: 'user_id=eq.' + userId,
      }, callback)
      .subscribe()
}
