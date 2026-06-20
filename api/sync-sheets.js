import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

// 날짜를 YY/MM/DD 형식으로 변환
function formatDate(dateStr) {
  const d = new Date(dateStr || new Date())
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}/${mm}/${dd}`
}

// 기존 회원 전체를 구글시트에 일괄 동기화하는 엔드포인트
// 호출: GET /api/sync-sheets?secret=YOUR_SECRET
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  // 간단한 보안: secret 파라미터 확인
  const SECRET = process.env.SYNC_SECRET || 'sync2026'
  if (req.query.secret !== SECRET) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' })
  }

  const SHEET_WEBHOOK = process.env.VITE_GOOGLE_SHEET_WEBHOOK
  if (!SHEET_WEBHOOK) {
    return res.status(500).json({ ok: false, error: 'SHEET_WEBHOOK not set' })
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ ok: false, error: 'Missing Supabase env' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // 전체 회원 조회 (가입일 오름차순)
  const { data: users, error } = await supabase
    .from('users')
    .select('id, created_at, telegram_id, telegram_username, telegram_first_name, telegram_last_name, nickname')
    .order('created_at', { ascending: true })

  if (error) {
    return res.status(500).json({ ok: false, error: error.message })
  }

  let successCount = 0
  let failCount = 0

  for (let i = 0; i < users.length; i++) {
    const u = users[i]
    const fullName = [u.telegram_first_name, u.telegram_last_name].filter(Boolean).join(' ')
      || u.nickname
      || ''

    try {
      const r = await fetch(SHEET_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          joined_at: formatDate(u.created_at),
          seq: i + 1,
          telegram_id: u.telegram_id || '',
          telegram_username: u.telegram_username ? '@' + u.telegram_username : '',
          name: fullName
        })
      })
      if (r.ok) {
        successCount++
      } else {
        failCount++
        console.error('Sheet webhook failed for user', u.id, await r.text())
      }
      // 구글시트 속도제한 방지: 각 요청 사이에 300ms 대기
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch(e) {
      failCount++
      console.error('Sheet webhook error for user', u.id, e.message)
    }
  }

  return res.status(200).json({
    ok: true,
    total: users.length,
    success: successCount,
    fail: failCount
  })
}
