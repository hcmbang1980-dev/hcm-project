import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// ads 테이블 position='popup' 기반 팝업
// close_hours 설정에 따라 localStorage로 닫기 시간 관리
export default function PopupModal() {
    const [popups, setPopups] = useState([])
    const [current, setCurrent] = useState(0)
    const [visible, setVisible] = useState(false)

  useEffect(() => {
        fetchPopups()
  }, [])

  const fetchPopups = async () => {
        const now = new Date().toISOString()
        const { data } = await supabase
          .from('ads')
          .select('*')
          .eq('position', 'popup')
          .eq('active', true)
          .or(`start_date.is.null,start_date.lte.${now}`)
          .or(`end_date.is.null,end_date.gte.${now}`)
          .order('sort_order', { ascending: true })

        if (!data || data.length === 0) return

        // 각 팝업의 localStorage 닫기 여부 확인
        const visiblePopups = data.filter(popup => {
                const key = `popup_${popup.id}`
                const hiddenUntil = localStorage.getItem(key)
                if (hiddenUntil && Number(hiddenUntil) > Date.now()) return false
                return true
        })

        if (visiblePopups.length > 0) {
                setPopups(visiblePopups)
                setVisible(true)
        }
  }

  const closePopup = (hours) => {
        if (!popups[current]) return
        const popup = popups[current]
        const closeHours = hours ?? popup.close_hours ?? 24
        const expire = Date.now() + closeHours * 60 * 60 * 1000
        localStorage.setItem(`popup_${popup.id}`, expire.toString())

        // 다음 팝업으로 이동하거나 닫기
        const remaining = popups.filter((p, idx) => {
                if (idx <= current) return false
                const key = `popup_${p.id}`
                const hiddenUntil = localStorage.getItem(key)
                return !(hiddenUntil && Number(hiddenUntil) > Date.now())
        })

        if (remaining.length > 0) {
                const nextIdx = popups.indexOf(remaining[0])
                setCurrent(nextIdx)
        } else {
                setVisible(false)
        }
  }

  if (!visible || popups.length === 0) return null

  const popup = popups[current]
    const isMobile = window.innerWidth <= 768
    const imgUrl = (isMobile && popup.mobile_image_url) ? popup.mobile_image_url : popup.image_url

  return (
        <div
                style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.75)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}
                onClick={() => setVisible(false)}
              >
              <div
                        onClick={e => e.stopPropagation()}
                        style={{ background:'#1a1a1a', border:'1px solid #d4af37', borderRadius:'16px', maxWidth:'480px', width:'100%', overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.8)' }}
                      >
                {/* 이미지 */}
                {imgUrl && (
                                  <div style={{ width:'100%', maxHeight:'300px', overflow:'hidden' }}>
                                    {popup.link_url ? (
                                                  <a href={popup.link_url} target="_blank" rel="noopener noreferrer">
                                                                  <img src={imgUrl} alt={popup.title} style={{ width:'100%', objectFit:'cover', display:'block' }} />
                                                  </a>
                                                ) : (
                                                  <img src={imgUrl} alt={popup.title} style={{ width:'100%', objectFit:'cover', display:'block' }} />
                                                )}
                                  </div>
                      )}
              
                {/* 내용 */}
                      <div style={{ padding:'20px' }}>
                        {popup.title && <h2 style={{ color:'#d4af37', fontSize:'18px', fontWeight:'bold', marginBottom:'8px' }}>{popup.title}</h2>}
                        {popup.link_url && (
                                    <a href={popup.link_url} target="_blank" rel="noopener noreferrer"
                                                    style={{ display:'inline-block', background:'#d4af37', color:'#000', padding:'8px 20px', borderRadius:'8px', fontWeight:'bold', textDecoration:'none', fontSize:'14px', marginBottom:'12px' }}>
                                                  자세히 보기 →
                                    </a>
                                )}
                      
                        {/* 여러 팝업 네비게이션 */}
                        {popups.length > 1 && (
                                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
                                                  <button onClick={() => setCurrent(p => Math.max(0, p-1))} disabled={current === 0}
                                                                    style={{ background:'#333', color:'#fff', border:'none', borderRadius:'6px', padding:'4px 12px', cursor:'pointer', opacity:current===0?0.4:1 }}>‹</button>
                                                  <span style={{ color:'#888', fontSize:'13px' }}>{current + 1} / {popups.length}</span>
                                                  <button onClick={() => setCurrent(p => Math.min(popups.length-1, p+1))} disabled={current === popups.length-1}
                                                                    style={{ background:'#333', color:'#fff', border:'none', borderRadius:'6px', padding:'4px 12px', cursor:'pointer', opacity:current===popups.length-1?0.4:1 }}>›</button>
                                    </div>
                                )}
                      
                        {/* 닫기 버튼 */}
                                <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end', flexWrap:'wrap' }}>
                                            <button onClick={() => closePopup(24)}
                                                            style={{ background:'transparent', color:'#888', border:'1px solid #444', borderRadius:'6px', padding:'7px 14px', cursor:'pointer', fontSize:'12px' }}>
                                                          오늘 하루 안보기
                                            </button>
                                  {popup.close_hours > 24 && (
                                      <button onClick={() => closePopup(popup.close_hours)}
                                                        style={{ background:'transparent', color:'#888', border:'1px solid #444', borderRadius:'6px', padding:'7px 14px', cursor:'pointer', fontSize:'12px' }}>
                                        {popup.close_hours}시간 안보기
                                      </button>
                                            )}
                                            <button onClick={() => setVisible(false)}
                                                            style={{ background:'#333', color:'#fff', border:'none', borderRadius:'6px', padding:'7px 14px', cursor:'pointer', fontSize:'12px' }}>
                                                          닫기
                                            </button>
                                </div>
                      </div>
              </div>
        </div>
      )
}</div>
