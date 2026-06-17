export default async function handler(req, res) {
  if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' })
        }

          const BOT_TOKEN = process.env.VITE_TELEGRAM_BOT_TOKEN
            const GROUP_ID = process.env.TELEGRAM_GROUP_ID

              if (!BOT_TOKEN || !GROUP_ID) {
                  return res.status(500).json({ ok: false, error: 'Missing env variables' })
                    }

                      const { text, nickname } = req.body

                        if (!text) {
                            return res.status(400).json({ ok: false, error: 'Missing text' })
                              }

                                const response = await fetch(
                                    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
                                        {
                                              method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                          body: JSON.stringify({
                                                                  chat_id: GROUP_ID,
                                                                          text: `💬 ${nickname || '회원'}: ${text}`,
                                                                                  parse_mode: 'HTML'
                                                                                        })
                                                                                            }
                                                                                              )

                                                                                                const data = await response.json()
                                                                                                  return res.status(200).json(data)
                                                                                                  }
