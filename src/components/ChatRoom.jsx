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
      const { error: dbErr } = await supabase.from('messages').insert({
        text,
        user_id: user.id,
        nickname: user.nickname || '회원',
        photo_url: user.telegram_photo || null,
        source: 'site'
      })
      if (dbErr) {
        console.error('DB insert error:', dbErr)
        setInput(text)
        return
      }
      fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          user_id: user.id,
          nickname: user.nickname,
          photo_url: user.telegram_photo || null,
          tg_only: true
        }),
      }).catch(e => console.warn('TG send failed (ignored):', e))
    } catch (e) {
      console.error('send error:', e)
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
          <div className="chat-empty">no messages yet</div>
        )}
        {messages.map((msg) => {
          const isMe = msg.user_id === user?.id
          const isTelegram = msg.source === 'telegram'
          return (
            <div key={msg.id} className={"chat-msg " + (isMe ? 'mine' : 'others')}>
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
                    {msg.nickname || 'anon'}
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
          placeholder="type message"
          rows={1}
          disabled={sending}
        />
        <button
          className="chat-send-btn"
          onClick={sendMessage}
          disabled={sending || !input.trim()}
        >
          {sending ? '...' : 'send'}
        </button>
      </div>
    </div>
  )
}
