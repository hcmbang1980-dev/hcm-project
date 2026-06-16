import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './ChatRoom.css'

export default function ChatRoom() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    fetchMessages()

    const channel = supabase
      .channel('chat-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100)
    if (data) setMessages(data)
  }

  const sendMessage = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    const text = input.trim()
    setInput('')

    try {
      const res = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          user_id: user.id,
          nickname: user.nickname,
          photo_url: user.telegram_photo || null,
        }),
      })
      if (!res.ok) throw new Error('전송 실패')
    } catch (e) {
      alert('메시지 전송에 실패했습니다.')
      setInput(text)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (ts) => {
    const d = new Date(ts)
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="chatroom">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">첫 메시지를 보내보세요! 텔레그램 소통방과 연동됩니다 💬</div>
        )}
        {messages.map((msg) => {
          const isMe = msg.user_id === user?.id
          const isTelegram = msg.source === 'telegram'
          return (
            <div key={msg.id} className={`chat-msg ${isMe ? 'mine' : 'others'}`}>
              {!isMe && (
                <div className="chat-avatar">
                  {msg.photo_url
                    ? <img src={msg.photo_url} alt="" />
                    : <span>{(msg.nickname || '?')[0]}</span>
                  }
                </div>
              )}
              <div className="chat-bubble-wrap">
                {!isMe && (
                  <div className="chat-name">
                    {isTelegram && <span className="tg-badge">TG</span>}
                    {msg.nickname || '익명'}
                  </div>
                )}
                <div className="chat-bubble">{msg.text}</div>
                <div className="chat-time">{formatTime(msg.created_at)}</div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-area">
        <textarea
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요... (Enter로 전송)"
          rows={1}
          disabled={sending}
        />
        <button
          className="chat-send-btn"
          onClick={sendMessage}
          disabled={sending || !input.trim()}
        >
          {sending ? '...' : '전송'}
        </button>
      </div>
    </div>
  )
}