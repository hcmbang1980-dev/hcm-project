export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, message: 'Telegram Bot Webhook' })
  }

  const BOT_TOKEN = process.env.VITE_TELEGRAM_BOT_TOKEN
  const COMMUNITY_LINK = process.env.TELEGRAM_COMMUNITY_LINK || 'https://t.me/bangasgan'
  const SITE_URL = 'https://www.hcmboom.com'

  const update = req.body
  const message = update?.message
  
  if (!message) return res.status(200).json({ ok: true })

  const chatId = message.chat.id
  const text = message.text || ''
  const firstName = message.from?.first_name || '회원'

  async function sendMessage(chatId, text, options = {}) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...options })
    })
  }

  if (text === '/start') {
    await sendMessage(chatId, 
`🔥 <b>호치민방앗간에 오신 것을 환영합니다!</b>

베트남 밤문화 No.1 커뮤니티입니다.

📌 <b>이용 방법</b>
1️⃣ 아래 버튼으로 사이트 가입
2️⃣ 텔레그램 계정으로 1초 로그인
3️⃣ 가입 즉시 10 포인트 지급!

💬 소통방도 함께 참여하세요 👇`,
      {
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [{ text: '🌐 사이트 가입하기', url: `${SITE_URL}/login` }],
            [{ text: '💬 소통방 참여하기', url: COMMUNITY_LINK }]
          ]
        })
      }
    )
  } else {
    await sendMessage(chatId,
`호치민방앗간 봇입니다 🔥

/start - 시작하기`)
  }

  return res.status(200).json({ ok: true })
}
