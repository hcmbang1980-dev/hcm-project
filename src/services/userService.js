import { supabase } from '../lib/supabase'
import { addAdminLog } from './adminLogService'

// 회원 목록 조회
export async function getUsers(search = '') {
    let query = supabase
      .from('users')
      .select('id, nickname, telegram_username, telegram_id, role, level, level_num, points, status, admin_memo, banned_at, last_login, created_at')
      .order('created_at', { ascending: false })

  if (search) {
        query = query.or(`nickname.ilike.%${search}%,telegram_username.ilike.%${search}%`)
  }

  const { data, error } = await query
    if (error) return []
        return data
}

// 회원 차단
export async function banUser(user, reason = '', adminName = '운영자') {
    const { error } = await supabase
      .from('users')
      .update({ status: 'banned', banned_at: new Date().toISOString() })
      .eq('id', user.id)

  if (!error) {
        await addAdminLog({
                action: '회원차단',
                targetUser: user.nickname,
                telegramId: user.telegram_id,
                reason,
                adminName,
        })
        // 차단 이력 기록
      await supabase.from('user_blocks').insert({
              user_id: user.id,
              reason,
              admin_name: adminName,
              blocked_at: new Date().toISOString(),
      })
  }
    return !error
}

// 회원 차단 해제
export async function unbanUser(user, adminName = '운영자') {
    const { error } = await supabase
      .from('users')
      .update({ status: 'active', banned_at: null })
      .eq('id', user.id)

  if (!error) {
        await addAdminLog({
                action: '차단해제',
                targetUser: user.nickname,
                telegramId: user.telegram_id,
                reason: '정상복구',
                adminName,
        })
        // 차단 이력 해제 시간 기록
      await supabase
          .from('user_blocks')
          .update({ unblocked_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .is('unblocked_at', null)
  }
    return !error
}

// 역할 변경
export async function changeRole(userId, newRole, targetNickname, adminName = '운영자') {
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId)
    if (!error) {
          await addAdminLog({ action: '역할변경', targetUser: targetNickname, reason: newRole, adminName })
    }
    return !error
}

// 레벨 변경
export async function changeLevelNum(userId, newLevel, targetNickname, adminName = '운영자') {
    const { error } = await supabase.from('users').update({ level_num: newLevel }).eq('id', userId)
    if (!error) {
          await addAdminLog({ action: '레벨변경', targetUser: targetNickname, reason: `Lv.${newLevel}`, adminName })
    }
    return !error
}

// 관리자 메모 저장
export async function saveAdminMemo(userId, memo) {
    const { error } = await supabase.from('users').update({ admin_memo: memo }).eq('id', userId)
    return !error
}

// 차단 여부 확인 (로그인 시 사용)
export async function checkUserStatus(telegramId) {
    const { data } = await supabase.from('users').select('status, admin_memo').eq('telegram_id', telegramId).single()
    return data
}
