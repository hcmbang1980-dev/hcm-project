import React, { useState, useRef, useEffect, useCallback } from 'react'
import ChatRoom from './ChatRoom'

// FloatingChat: 드래그 가능, 크기 조절, 최소화/최대화, 닫기 기능의 채팅 팝업 컴포넌트
// AdminPage의 UI 설정에서 chat_position 이 bottom-right, bottom-left, top-right, top-left 일때 활성화
export default function FloatingChat({ settings = {} }) {
    const pos = settings.chat_position || 'bottom-right'
    const initWidth = parseInt(settings.chat_width) || 380
    const initHeight = parseInt(settings.chat_height) || 500

  // 초기 위치 계산
  const getInitPos = () => {
        const right = parseInt(settings.chat_right) || 20
        const bottom = parseInt(settings.chat_bottom) || 20
        if (pos === 'bottom-right') return { x: window.innerWidth - initWidth - right, y: window.innerHeight - initHeight - bottom }
        if (pos === 'bottom-left') return { x: right, y: window.innerHeight - initHeight - bottom }
        if (pos === 'top-right') return { x: window.innerWidth - initWidth - right, y: 80 }
        if (pos === 'top-left') return { x: right, y: 80 }
        return { x: window.innerWidth - initWidth - 20, y: window.innerHeight - initHeight - 20 }
  }

  const [visible, setVisible] = useState(true)
    const [minimized, setMinimized] = useState(false)
    const [size, setSize] = useState({ width: initWidth, height: initHeight })
    const [position, setPosition] = useState(() => getInitPos())
    const [isDragging, setIsDragging] = useState(false)
    const [isResizing, setIsResizing] = useState(false)
    const [resizeDir, setResizeDir] = useState('')
    const dragOffset = useRef({ x: 0, y: 0 })
    const resizeStart = useRef({})
    const containerRef = useRef(null)

  // 드래그 시작
  const onDragStart = useCallback((e) => {
        if (e.button !== 0) return
        e.preventDefault()
        setIsDragging(true)
        dragOffset.current = {
                x: e.clientX - position.x,
                y: e.clientY - position.y
        }
  }, [position])

  // 리사이즈 시작
  const onResizeStart = useCallback((e, dir) => {
        e.preventDefault()
        e.stopPropagation()
        setIsResizing(true)
        setResizeDir(dir)
        resizeStart.current = {
                x: e.clientX, y: e.clientY,
                w: size.width, h: size.height,
                px: position.x, py: position.y
        }
  }, [size, position])

  useEffect(() => {
        const onMouseMove = (e) => {
                if (isDragging) {
                          const nx = e.clientX - dragOffset.current.x
                          const ny = e.clientY - dragOffset.current.y
                          // 화면 밖으로 나가지 않도록 제한
                  const maxX = window.innerWidth - size.width
                          const maxY = window.innerHeight - (minimized ? 48 : size.height)
                          setPosition({ x: Math.max(0, Math.min(nx, maxX)), y: Math.max(0, Math.min(ny, maxY)) })
                }
                if (isResizing) {
                          const dx = e.clientX - resizeStart.current.x
                          const dy = e.clientY - resizeStart.current.y
                          let nw = resizeStart.current.w
                          let nh = resizeStart.current.h
                          let nx = resizeStart.current.px
                          let ny = resizeStart.current.py
                          if (resizeDir.includes('e')) nw = Math.max(260, resizeStart.current.w + dx)
                          if (resizeDir.includes('s')) nh = Math.max(300, resizeStart.current.h + dy)
                          if (resizeDir.includes('w')) { nw = Math.max(260, resizeStart.current.w - dx); nx = resizeStart.current.px + dx }
                          if (resizeDir.includes('n')) { nh = Math.max(300, resizeStart.current.h - dy); ny = resizeStart.current.py + dy }
                          setSize({ width: nw, height: nh })
                          setPosition({ x: nx, y: ny })
                }
        }
        const onMouseUp = () => {
                setIsDragging(false)
                setIsResizing(false)
        }
        if (isDragging || isResizing) {
                window.addEventListener('mousemove', onMouseMove)
                window.addEventListener('mouseup', onMouseUp)
        }
        return () => {
                window.removeEventListener('mousemove', onMouseMove)
                window.removeEventListener('mouseup', onMouseUp)
        }
  }, [isDragging, isResizing, resizeDir, size, minimized])

  if (!visible) {
        // 닫힌 상태: 다시 열기 버튼
      return (
              <button
                        onClick={() => setVisible(true)}
                        title="채팅 열기"
                        style={{
                                    position: 'fixed',
                                    bottom: parseInt(settings.chat_bottom) || 20,
                                    right: pos.includes('left') ? 'auto' : parseInt(settings.chat_right) || 20,
                                    left: pos.includes('left') ? parseInt(settings.chat_right) || 20 : 'auto',
                                    width: 52, height: 52,
                                    borderRadius: '50%',
                                    background: '#d4af37',
                                    color: '#000',
                                    border: 'none',
                                    fontSize: '22px',
                                    cursor: 'pointer',
                                    zIndex: 9000,
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >💬</button>button>
            )
  }
  
    const HEADER_H = 44
        const RESIZE_SIZE = 8
          
            const resizeHandles = [
              { dir: 'n',  style: { top: 0, left: RESIZE_SIZE, right: RESIZE_SIZE, height: RESIZE_SIZE, cursor: 'n-resize' } },
              { dir: 's',  style: { bottom: 0, left: RESIZE_SIZE, right: RESIZE_SIZE, height: RESIZE_SIZE, cursor: 's-resize' } },
              { dir: 'e',  style: { right: 0, top: RESIZE_SIZE, bottom: RESIZE_SIZE, width: RESIZE_SIZE, cursor: 'e-resize' } },
              { dir: 'w',  style: { left: 0, top: RESIZE_SIZE, bottom: RESIZE_SIZE, width: RESIZE_SIZE, cursor: 'w-resize' } },
              { dir: 'ne', style: { top: 0, right: 0, width: RESIZE_SIZE, height: RESIZE_SIZE, cursor: 'ne-resize' } },
              { dir: 'nw', style: { top: 0, left: 0, width: RESIZE_SIZE, height: RESIZE_SIZE, cursor: 'nw-resize' } },
              { dir: 'se', style: { bottom: 0, right: 0, width: RESIZE_SIZE, height: RESIZE_SIZE, cursor: 'se-resize' } },
              { dir: 'sw', style: { bottom: 0, left: 0, width: RESIZE_SIZE, height: RESIZE_SIZE, cursor: 'sw-resize' } },
                ]
              
                return (
                      <div
                              ref={containerRef}
                              style={{
                                        position: 'fixed',
                                        left: position.x,
                                        top: position.y,
                                        width: size.width,
                                        height: minimized ? HEADER_H : size.height,
                                        zIndex: 9000,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        background: '#111',
                                        border: '1.5px solid #d4af37',
                                        borderRadius: 12,
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                                        overflow: 'hidden',
                                        userSelect: isDragging || isResizing ? 'none' : 'auto',
                                        transition: isDragging || isResizing ? 'none' : 'height 0.2s ease',
                              }}
                            >
                        {/* 리사이즈 핸들 (최소화 아닐 때만) */}
                        {!minimized && resizeHandles.map(h => (
                                      <div
                                                  key={h.dir}
                                                  onMouseDown={e => onResizeStart(e, h.dir)}
                                                  style={{
                                                                position: 'absolute',
                                                                ...h.style,
                                                                zIndex: 10,
                                                  }}
                                                />
                                    ))}
                      
                        {/* 헤더 (드래그 영역) */}
                            <div
                                      onMouseDown={onDragStart}
                                      style={{
                                                  height: HEADER_H,
                                                  minHeight: HEADER_H,
                                                  background: 'linear-gradient(90deg, #1a1a1a, #222)',
                                                  borderBottom: minimized ? 'none' : '1px solid #333',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  padding: '0 10px',
                                                  cursor: 'grab',
                                                  userSelect: 'none',
                                                  gap: 8,
                                      }}
                                    >
                                    <span style={{ fontSize: 16 }}>💬</span>span>
                                    <span style={{ flex: 1, color: '#d4af37', fontWeight: 'bold', fontSize: 14 }}>실시간 채팅</span>span>
                              {/* 크기 리셋 버튼 */}
                                    <button
                                                onMouseDown={e => e.stopPropagation()}
                                                onClick={() => { setSize({ width: initWidth, height: initHeight }); setPosition(getInitPos()) }}
                                                title="위치/크기 초기화"
                                                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 14, padding: '2px 5px', borderRadius: 4, lineHeight: 1 }}
                                              >⟲</button>button>
                              {/* 최소화 버튼 */}
                                    <button
                                                onMouseDown={e => e.stopPropagation()}
                                                onClick={() => setMinimized(m => !m)}
                                                title={minimized ? '펼치기' : '최소화'}
                                                style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 16, padding: '2px 5px', borderRadius: 4, lineHeight: 1 }}
                                              >{minimized ? '▲' : '▼'}</button>button>
                              {/* 닫기 버튼 */}
                                    <button
                                                onMouseDown={e => e.stopPropagation()}
                                                onClick={() => setVisible(false)}
                                                title="닫기"
                                                style={{ background: 'none', border: 'none', color: '#ff6666', cursor: 'pointer', fontSize: 16, padding: '2px 5px', borderRadius: 4, lineHeight: 1 }}
                                              >✕</button>button>
                            </div>div>
                      
                        {/* 채팅 본문 */}
                        {!minimized && (
                                      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                                <ChatRoom />
                                      </div>div>
                            )}
                      </div>div>
                    )
}</button>
