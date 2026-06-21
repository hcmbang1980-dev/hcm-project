import { supabase } from '../lib/supabase'
import { addAdminLog } from './adminLogService'

// 신고 접수
export async function submitReport({ reporterId, targetType, targetId, reason }) {
    const { data, error } = await supabase.from('reports').insert({
          reporter_id: reporterId,
          target_type: targetType,
          target_id: String(targetId),
          reason,
          status: 'pending',
        }).select().single()
    if (error) return { success: false, error: error.message }
    return { success: true, data }
  }

// 신고 목록 (관리자)
export async function getReports(status = null, limit = 50) {
    let query = supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (status) query = query.eq('status', status)
    const { data, error } = await query
    if (error) return []
    return data
  }

// 신고 처리 (관리자)
export async function resolveReport(reportId, action, adminName = '운영자') {
    const { error } = await supabase
      .from('reports')
      .update({ status: action })
      .eq('id', reportId)
    if (!error) {
          await addAdminLog({
                  action: '신고처리',
                  targetUser: String(reportId),
                  reason: action,
                  adminName,
                })
        }
    return !error
  }

// 신고 개수 확인 (중복 신고 방지)
export async function hasReported(reporterId, targetType, targetId) {
    const { count } = await supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('reporter_id', reporterId)
      .eq('target_type', targetType)
      .eq('target_id', String(targetId))
    return (count || 0) > 0
  }
