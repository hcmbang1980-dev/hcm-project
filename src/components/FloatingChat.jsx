import React, { useState, useRef, useEffect, useCallback } from 'react'
import ChatRoom from './ChatRoom'

export default function FloatingChat({ settings = {} }) {
  const pos = settings.chat_position || 'bottom-right'
  const initW = parseInt(settings.chat_width) || 380
  const initH = parseInt(settings.chat_height) || 500
  const rightOff = parseInt(settings.chat_right) || 20
  const bottomOff = parseInt(settings.chat_bottom) || 20

  const getInitPos = () => {
    if (pos === 'bottom-right') return { x: window.innerWidth - initW - rightOff, y: window.innerHeight - initH - bottomOff }
    if (pos === 'bottom-left') return { x: rightOff, y: window.innerHeight - initH - bottomOff }
    if (pos === 'top-right') return { x: window.innerWidth - initW - rightOff, y: 80 }
    if (pos === 'top-left') return { x: rightOff, y: 80 }
    return { x: window.innerWidth - initW - 20, y: window.innerHeight - initH - 20 }
  }

  const [minimized, setMinimized] = useState(false)
  const [size, setSize] = useState({ width: initW, height: initH })
  const [position, setPosition] = useState(getInitPos)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeDir, setResizeDir] = useState('')
  const dragOffset = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({})
  const HEADER_H = 44

  const onDragStart = useCallback((e) => {
    if (e.button !== 0 || minimized) return
    e.preventDefault()
    setIsDragging(true)
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y }
  }, [position, minimized])

  const onResizeStart = useCallback((e, dir) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setResizeDir(dir)
    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.width, h: size.height, px: position.x, py: position.y }
  }, [size, position])

  useEffect(() => {
    const onMove = (e) => {
      if (isDragging) {
        const nx = e.clientX - dragOffset.current.x
        const ny = e.clientY - dragOffset.current.y
        setPosition({ x: Math.max(0, Math.min(nx, window.innerWidth - size.width)), y: Math.max(0, Math.min(ny, window.innerHeight - HEADER_H)) })
      }
      if (isResizing) {
        const dx = e.clientX - resizeStart.current.x
        const dy = e.clientY - resizeStart.current.y
        let nw = resizeStart.current.w
        let nh = resizeStart.current.h
        let nx = resizeStart.current.px
        let ny = resizeStart.current.py
        if (resizeDir.includes('e')) nw = Math.max(260, nw + dx)
        if (resizeDir.includes('s')) nh = Math.max(300, nh + dy)
        if (resizeDir.includes('w')) { nw = Math.max(260, resizeStart.current.w - dx); nx = resizeStart.current.px + dx }
        if (resizeDir.includes('n')) { nh = Math.max(300, resizeStart.current.h - dy); ny = resizeStart.current.py + dy }
        setSize({ width: nw, height: nh })
        setPosition({ x: nx, y: ny })
      }
    }
    const onUp = () => { setIsDragging(false); setIsResizing(false) }
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    }
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [isDragging, isResizing, resizeDir, size])

  const RS = 8
  const handles = [
    { dir: 'n',  s: { top: 0, left: RS, right: RS, height: RS, cursor: 'n-resize' } },
    { dir: 's',  s: { bottom: 0, left: RS, right: RS, height: RS, cursor: 's-resize' } },
    { dir: 'e',  s: { right: 0, top: RS, bottom: RS, width: RS, cursor: 'e-resize' } },
    { dir: 'w',  s: { left: 0, top: RS, bottom: RS, width: RS, cursor: 'w-resize' } },
    { dir: 'ne', s: { top: 0, right: 0, width: RS, height: RS, cursor: 'ne-resize' } },
    { dir: 'nw', s: { top: 0, left: 0, width: RS, height: RS, cursor: 'nw-resize' } },
    { dir: 'se', s: { bottom: 0, right: 0, width: RS, height: RS, cursor: 'se-resize' } },
    { dir: 'sw', s: { bottom: 0, left: 0, width: RS, height: RS, cursor: 'sw-resize' } },
  ]

  // 최소화 상태일 때: 우측 하단에 고정 (fixed)
  if (minimized) {
    return (
      <div style={{
        position: 'fixed',
        bottom: bottomOff,
        right: rightOff,
        zIndex: 9000,
        width: size.width,
        height: HEADER_H,
        background: '#1a1a1a',
        border: '1.5px solid #d4af37',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
        gap: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
        cursor: 'pointer',
      }}
        onClick={() => setMinimized(false)}
      >
        <span style={{ fontSize: 16 }}>💬</span>
        <span style={{ flex: 1, color: '#d4af37', fontWeight: 'bold', fontSize: 14 }}>실시간 채팅</span>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); setMinimized(false) }}
          title="펼치기"
          style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 16, padding: '2px 5px', borderRadius: 4, lineHeight: 1 }}
        >▲</button>
      </div>
    )
  }

  const containerStyle = {
    position: 'fixed', left: position.x, top: position.y,
    width: size.width, height: size.height,
    zIndex: 9000, display: 'flex', flexDirection: 'column',
    background: '#111', border: '1.5px solid #d4af37', borderRadius: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.7)', overflow: 'hidden',
    userSelect: isDragging || isResizing ? 'none' : 'auto',
  }

  const headerStyle = {
    height: HEADER_H, minHeight: HEADER_H,
    background: 'linear-gradient(90deg,#1a1a1a,#222)',
    borderBottom: '1px solid #333',
    display: 'flex', alignItems: 'center', padding: '0 10px',
    cursor: 'grab', userSelect: 'none', gap: 8,
  }

  return (
    <div style={containerStyle}>
      {handles.map(h => (
        <div key={h.dir} onMouseDown={e => onResizeStart(e, h.dir)} style={{ position: 'absolute', zIndex: 10, ...h.s }} />
      ))}
      <div onMouseDown={onDragStart} style={headerStyle}>
        <span style={{ fontSize: 16 }}>💬</span>
        <span style={{ flex: 1, color: '#d4af37', fontWeight: 'bold', fontSize: 14 }}>실시간 채팅</span>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => setMinimized(true)}
          title="최소화"
          style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 16, padding: '2px 5px', borderRadius: 4, lineHeight: 1 }}
        >▼</button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <ChatRoom />
      </div>
    </div>
  )
}
