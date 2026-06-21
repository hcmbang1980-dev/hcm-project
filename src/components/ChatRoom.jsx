import React, { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './ChatRoom.css'

export default function ChatRoom() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const channelRef = useRef(null)

  const fetchMessages = useCallback(async () => {
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('messages')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(100)
    if (data) setMessages(data)
    return data
  }, [])

  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    fetchMessages().then(() => {
      const channel = supabase
        .channel('public:messages:chat')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            setMessages(prev => {
              if (prev.some(m => m.id === payload.new.id)) return prev
              return [...prev, payload.new]
            })
          }
        )
        .subscribe()
      channelRef.current = channel
    })
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [fetchMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    const text = input.trim()
    setInput('')
    try {
      const { error: dbErr } = await supabase.from('messages').insert({
        text, user_id: user.id,
        nickname: user.nickname || user.telegram_first_name || '회원',
        photo_url: user.telegram_photo || null,
        source: 'site'
      }).select().single()
      if (dbErr) { setInput(text); return }
      fetch('/api/send-message', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, user_id: user.id, nickname: user.nickname || user.telegram_first_name || '회원', photo_url: user.telegram_photo || null, tg_only: true }),
      }).catch(e => console.warn('TG send failed:', e))
    } catch (e) { setInput(text) } finally { setSending(false) }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const formatTime = (ts) => {
    const d = new Date(ts)
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="chatroom">
      <div className="chat-messages">
        {messages.length === 0 && <div className="chat-empty">최근 48시간 메시지가 없습니다</div>}
        {messages.map((msg) => {
          const isMe = msg.user_id === user?.id
          const isTelegram = msg.source === 'telegram'
          return (
            <div key={msg.id} className={"chat-msg " + (isMe ? 'mine' : 'others')}>
              {!isMe && (
                <div className="chat-avatar">
                  {msg.photo_url ? <img src={msg.photo_url} alt="" /> : <span>{(msg.nickname || '?')[0]}</span>}
                </div>
              )}
              <div className="chat-bubble-wrap">
                {!isMe && <div className="chat-name">{isTelegram && <span className="tg-badge">TG</span>}{msg.nickname || 'anon'}</div>}
                <div className="chat-bubble">{msg.text}</div>
                <div className="chat-time">{formatTime(msg.created_at)}</div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-area">
        <textarea className="chat-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="type message" rows={1} disabled={sending} />
        <button className="chat-send-btn" onClick={sendMessage} disabled={sending || !input.trim()}>{sending ? '...' : 'send'}</button>
      </div>
    </div>
  )
}
