import { supabase } from '../lib/supabase'
import { addAdminLog } from './adminLogService'

// 포인트 지급/차감 (users.points + point_history 동시 기록)
export async function givePoint(user, amount, reason, adminName = null) {
  const currentPoints = user.points || 0
    const newPoints = currentPoints + amount

      // users.points 업데이트
        const { error } = await supabase
            .from('users')
                .update({ points: newPoints })
                    .eq('id', user.id)

                      if (error) return false

                        // point_history 기록
                          await supabase.from('point_history').insert({
                              user_id: user.id,
                                  amount,
                                      reason,
                                        })

                                          // 관리자가 지급한 경우 admin_log도 기록
                                            if (adminName) {
                                                await addAdminLog({
                                                      action: '포인트지급',
                                                            targetUser: user.nickname,
                                                                  telegramId: user.telegram_id,
                                                                        reason: `${amount > 0 ? '+' : ''}${amount}P (${reason})`,
                                                                              adminName,
                                                                                  })
                                                                                    }

                                                                                      return true
                                                                                      }

                                                                                      // 포인트 내역 조회
                                                                                      export async function getPointHistory(userId, limit = 30) {
                                                                                        const { data, error } = await supabase
                                                                                            .from('point_history')
                                                                                                .select('*')
                                                                                                    .eq('user_id', userId)
                                                                                                        .order('created_at', { ascending: false })
                                                                                                            .limit(limit)
                                                                                                              if (error) return []
                                                                                                                return data
                                                                                                                }
                                                                                                                
                                                                                                                // 활동 포인트 자동 지급 (게시글, 댓글, 출석 등)
                                                                                                                // settings에서 포인트 값을 불러와서 사용
                                                                                                                export async function awardActivityPoint(user, activityType, settings) {
                                                                                                                  const pointMap = {
                                                                                                                      attendance: Number(settings?.attendance_point || 10),
                                                                                                                          post:       Number(settings?.post_point || 5),
                                                                                                                              comment:    Number(settings?.comment_point || 2),
                                                                                                                                  review:     Number(settings?.review_point || 20),
                                                                                                                                      signup:     Number(settings?.signup_point || 10),
                                                                                                                                        }
                                                                                                                                        
                                                                                                                                          const amount = pointMap[activityType]
                                                                                                                                            if (!amount) return false
                                                                                                                                            
                                                                                                                                              const reasonMap = {
                                                                                                                                                  attendance: '출석체크',
                                                                                                                                                      post:       '게시글 작성',
                                                                                                                                                          comment:    '댓글 작성',
                                                                                                                                                              review:     '후기 작성',
                                                                                                                                                                  signup:     '신규 가입',
                                                                                                                                                                    }
                                                                                                                                                                    
                                                                                                                                                                      return await givePoint(user, amount, reasonMap[activityType] || activityType)
                                                                                                                                                                      }
