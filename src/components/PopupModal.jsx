import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function PopupModal() {
  const [popups, setPopups] = useState([])
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(false)
  const [todayClosed, setTodayClosed] = useState(false)

  useEffect(() => {
    const closed = localStorage.getItem('popup_closed_today')
    const today = new Date().toISOString().split('T')[0]
    if (closed === today) {
      setTodayClosed(true)
      return
    }
    fetchPopups()
  }, [])

  const fetchPopups = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('popups')
      .select('*')
      .eq('is_active', true)
      .or(`start_date.is.null,start_date.lte.${today}`)
      .or(`end_date.is.null,end_date.gte.${today}`)
      .order('created_at', { ascending: false })

    if (data && data.length > 0) {
      setPopups(data)
      setVisible(true)
    }
  }

  const handleClose = () => {
    setVisible(false)
  }

  const handleCloseToday = () => {
    const today = new Date().toISOString().split('T')[0]
    localStorage.setItem('popup_closed_today', today)
    setVisible(false)
  }

  const handleNext = () => {
    if (current < popups.length - 1) setCurrent(prev => prev + 1)
    else setVisible(false)
  }

  const handlePrev = () => {
    if (current > 0) setCurrent(prev => prev - 1)
  }

  if (!visible || popups.length === 0 || todayClosed) return null

  const popup = popups[current]

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.75)', zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
      onClick={handleClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1a1a1a', border: '1px solid #d4af37',
          borderRadius: '16px', maxWidth: '480px', width: '100%',
          overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
        }}
      >
        {/* 팝업 이미지 */}
        {popup.image_url && (
          <div style={{ width: '100%', maxHeight: '280px', overflow: 'hidden' }}>
            {popup.link_url ? (
              <a href={popup.link_url} target="_blank" rel="noopener noreferrer">
                <img src={popup.image_url} alt={popup.title} style={{ width: '100%', objectFit: 'cover', display: 'block' }} />
              </a>
            ) : (
              <img src={popup.image_url} alt={popup.title} style={{ width: '100%', objectFit: 'cover', display: 'block' }} />
            )}
          </div>
        )}

        {/* 팝업 내용 */}
        <div style={{ padding: '20px' }}>
          <h2 style={{ color: '#d4af37', fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>{popup.title}</h2>
          {popup.content && <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', marginBottom: '12px' }}>{popup.content}</p>}
          {popup.link_url && (
            <a href={popup.link_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', background: '#d4af37', color: '#000', padding: '8px 20px', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none', fontSize: '14px', marginBottom: '12px' }}>
              자세히 보기 →
            </a>
          )}

          {/* 여러 팝업 네비게이션 */}
          {popups.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <button onClick={handlePrev} disabled={current === 0}
                style={{ background: '#333', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer', opacity: current === 0 ? 0.4 : 1 }}>
                ‹
              </button>
              <span style={{ color: '#888', fontSize: '13px' }}>{current + 1} / {popups.length}</span>
              <button onClick={handleNext}
                style={{ background: '#333', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer' }}>
                ›
              </button>
            </div>
          )}

          {/* 닫기 버튼들 */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={handleCloseToday}
              style={{ background: 'transparent', color: '#888', border: '1px solid #444', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>
              오늘 하루 안보기
            </button>
            <button onClick={handleClose}
              style={{ background: '#333', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
