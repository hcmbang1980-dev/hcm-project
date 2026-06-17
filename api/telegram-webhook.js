import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // GET 요청 시 webhook 자동 등록
if (req.method === 'GET') {
  const token = process.env.VITE_TELEGRAM_BOT_TOKEN;
  const webhookUrl = 'https://www.hcmboom.com/api/telegram-webhook';
  const setRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`);
  const setBody = await setRes.json();
  return res.status(200).json(setBody);
}

if (req.method !== 'POST') {
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}

  try {
    const update = req.body;

    if (!update.message) {
      return res.status(200).json({ ok: true });
    }

    const msg = update.message;
    const text = msg.text;
    const from = msg.from;

    // 텍스트 없는 메세지 무시 (사진, 스티커 등)
    if (!text) return res.status(200).json({ ok: true });

    // 봇 메세지 무시 (무한루프 방지)
    if (from.is_bot) return res.status(200).json({ ok: true });

    const nickname = from.username
      ? `@${from.username}`
      : from.first_name || '텔레그램유저';

    const photo_url = from.photo?.big_file_id
      ? `https://t.me/i/userpic/320/${from.username}.jpg`
      : null;

    // Supabase messages 테이블에 저장 → 커뮤 소통방에 실시간 표시됨
    const { error } = await supabase
      .from('messages')
      .insert({
        text: text,
        user_id: null,
        nickname: `📱 ${nickname}`,
        photo_url: photo_url,
      });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
