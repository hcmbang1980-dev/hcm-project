import React, { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getSettings } from '../services/settingsService'
import ChatRoom from '../components/ChatRoom'
import PopupModal from '../components/PopupModal'
import './HomePage.css'

const PLACES = [
  { icon: '🎤', name: '한가라 & 로컬 가라오케', path: '/places/karaoke', key: 'karaoke' },
  { icon: '🍺', name: '클럽 & 바', path: '/places/club', key: 'club' },
  { icon: '💆', name: '건전마사지 & 이발소', path: '/places/massage', key: 'massage' },
  { icon: '💋', name: '불건전마사지', path: '/places/adult-massage', key: 'adult' },
  { icon: '🏠', name: '풀빌라 & 에어비앤비', path: '/places/villa', key: 'villa' },
  { icon: '🚗', name: '렌트카 & 운전기사', path: '/places/rent', key: 'rent' },
  { icon: '🍜', name: '맛집', path: '/places/restaurant', key: 'food' },
  ]

const DEFAULT_STATS = { members: 330, online: 15, todayVisits: 70, totalVisits: 7000 }
const DEFAULT_LABELS = { members: '가입인원', online: '실시간 접속', todayVisits: '당일 방문자', totalVisits: '누적방문자수' }

export default function HomePage() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [posts, setPosts] = useState({ notice: [], event: [], free: [] })
    const [stats, setStats] = useState(DEFAULT_STATS)
    const [labels, setLabels] = useState(DEFAULT_LABELS)
    const [activePlace, setActivePlace] = useState(null)
    const [placeImages, setPlaceImages] = useState([])
    const visitTrackedRef = useRef(false)

  // site_settings (key/value 방식)
  const [settings, setSettings] = useState({
        chat_enabled: 'true',
        chat_right: '20',
        chat_bottom: '20',
        chat_width: '380',
        chat_height: '500',
        chat_position: 'bottom-right',
        stats_visible: 'true',
        notice_visible: 'true',
        banner_visible: 'true',
        hero_layout: 'default',
        main_sections_order: 'hero,stats,notice,board,banner',
  })

  useEffect(() => {
        fetchPosts()
        fetchStats()
        loadSettings()
        if (user && !visitTrackedRef.current) {
                visitTrackedRef.current = true
                trackVisit()
        }
  }, [user])

  useEffect(() => {
        const channel = supabase
          .channel('online-users')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'online_sessions' }, () => fetchOnlineCount())
          .subscribe()
        fetchOnlineCount()
        return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
        if (activePlace) fetchPlaceImages(activePlace.key)
  }, [activePlace])

  // site_settings key/value 방식으로 로드
  const loadSettings = async () => {
        try {
                const data = await getSettings()
                if (data && Object.keys(data).length > 0) {
                          setSettings(prev => ({ ...prev, ...data }))
                }
        } catch (e) {}
  }

  const fetchPlaceImages = async (placeKey) => {
        const { data } = await supabase.from('place_images').select('*').eq('place_key', placeKey).order('created_at', { ascending: true }).limit(12)
        setPlaceImages(data || [])
  }

  const fetchOnlineCount = async () => {
        const threshold = new Date(Date.now() - 10 * 60 * 1000).toISOString()
        const { count } = await supabase.from('online_sessions').select('*', { count: 'exact', head: true }).gte('last_seen', threshold)
        setStats(prev => ({ ...prev, online: DEFAULT_STATS.online + (count || 0) }))
   }

  const trackVisit = async () => {
        if (!user) return
        try {
                await supabase.from('online_sessions').upsert({
                          user_id: user.id,
                          last_seen: new Date().toISOString(),
                          nickname: user.nickname || user.telegram_first_name || '회원',
                }, { onConflict: 'user_id' })
                const today = new Date().toISOString().split('T')[0]
                const { data: existing } = await supabase.from('visitor_stats').select('total_visits').eq('date', today)
                if (existing) {
                          await supabase.from('visitor_stats').upsert({ date: today, total_visits: (existing[0]?.total_visits || 0) + 1 })
                }
        } catch (e) {}
  }

  const fetchPosts = async () => {
        const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(30)
        if (data) {
                setPosts({
                          notice: data.filter(p => p.board_type === 'notice').slice(0, 3),
                          event: data.filter(p => p.board_type === 'event').slice(0, 3),
                          free: data.filter(p => p.board_type === 'free').slice(0, 5),
                })
        }
  }

  const fetchStats = async () => {
        try {
                const { data: siteData } = await supabase.from('site_stats').select('*').eq('id', 1).single()
                if (siteData) {
                          setLabels({
                                      members: siteData.label_members || DEFAULT_LABELS.members,
                                      online: siteData.label_online || DEFAULT_LABELS.online,
                                      todayVisits: siteData.label_today || DEFAULT_LABELS.todayVisits,
                                      totalVisits: siteData.label_total || DEFAULT_LABELS.totalVisits,
                          })
                          const baseMembers = siteData?.base_members || DEFAULT_STATS.members
                          const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true })
                          setStats(prev => ({ ...prev, members: baseMembers + (userCount || 0), totalVisits: siteData.total_visitors || DEFAULT_STATS.totalVisits }))
                          const today = new Date().toISOString().split('T')[0]
                          const { data: todayData } = await supabase.from('visitor_stats').select('total_visits').eq('date', today).single()
                          if (todayData) setStats(prev => ({ ...prev, todayVisits: todayData.total_visits }))
                }
        } catch (e) {}
  }

  // settings에서 채팅 스타일 계산
const getChatStyle = () => {
      const pos = settings.chat_position || 'inline'
      if (pos === 'inline') return { position: 'relative', width: '100%' }
      const base = { position: 'fixed', zIndex: 1000 }
      if (pos === 'bottom-left') return { ...base, bottom: Number(settings.chat_bottom||20), left: Number(settings.chat_right||20) }
      if (pos === 'top-right') return { ...base, top: 80, right: Number(settings.chat_right||20) }
      if (pos === 'top-left') return { ...base, top: 80, left: Number(settings.chat_right||20) }
      return { ...base, bottom: Number(settings.chat_bottom||20), right: Number(settings.chat_right||20) }
}

  const renderStats = () => (
        <div className="stats-bar">
              <div className="stat-item"><span className="stat-num gold-text">{stats.members.toLocaleString()}+</span><span className="stat-label">{labels.members}</span></div>
              <div className="stat-divider"></div>
              <div className="stat-item"><span className="stat-num gold-text">{stats.online.toLocaleString()}+</span><span className="stat-label">{labels.online}</span></div>
              <div className="stat-divider"></div>
              <div className="stat-item"><span className="stat-num gold-text">{stats.todayVisits.toLocaleString()}+</span><span className="stat-label">{labels.todayVisits}</span></div>
              <div className="stat-divider"></div>
              <div className="stat-item"><span className="stat-num gold-text">{stats.totalVisits.toLocaleString()}+</span><span className="stat-label">{labels.totalVisits}</span></div>
        </div>
      )
    
      const sectionOrder = (settings.main_sections_order || 'hero,stats,notice,board,banner').split(',').map(s => s.trim())
        
          const sectionMap = {
                hero: !user && (
                        <section key="hero" className={`hero hero-${settings.hero_layout || 'default'}`}>
                                <div className="hero-bg"></div>
                                <div className="hero-content">
                                          <h1 className="hero-title"><span className="gold-text">호치민 방앗간</span><br />NO.1</h1>
                                          <p className="hero-subtitle">실시간으로 소통하는 호치민 방앗간 채팅<br />지금 바로 [호치민방앗간] 텔레그램으로 회원가입!</p>
                                          <div className="hero-buttons">
                                                      <Link to="/login" className="btn-gold hero-btn">🔥 텔레그램으로 회원가입</Link>
                                                      <Link to="/board/free" className="hero-btn-outline">🔥 커뮤니티 보기</Link>
                                          </div>
                                </div>
                        </section>
                      ),
                stats: settings.stats_visible !== 'false' && <div key="stats">{renderStats()}</div>,
                notice: settings.notice_visible !== 'false' && (
                        <section key="notice" className="places-section">
                                <div className="places-grid">
                                  {PLACES.map(place => (
                                      <div key={place.key} className={`place-card${activePlace?.key === place.key ? ' active' : ''}`} onClick={() => setActivePlace(activePlace?.key === place.key ? null : place)}>
                                                    <span className="place-icon">{place.icon}</span>
                                                    <span className="place-name">{place.name}</span>
                                      </div>
                                    ))}
                                </div>
                          {activePlace && (
                                    <div className="place-images-section">
                                                <h3 className="place-images-title">{activePlace.name} 사진</h3>
                                      {placeImages.length > 0 ? (
                                                    <div className="place-images-grid">
                                                      {placeImages.map(img => (
                                                                        <div key={img.id} className="place-image-card">
                                                                                            <img src={img.image_url} alt={img.caption || activePlace.name} />
                                                                          {img.caption && <p className="place-image-caption">{img.caption}</p>}
                                                                        </div>
                                                                      ))}
                                                    </div>
                                                  ) : <p className="no-images">등록된 사진이 없습니다.</p>}
                                    </div>
                                )}
                        </section>
                      ),
                board: (
                        <section key="board" className="board-section">
                                <div className="board-grid">
                                          <div className="board-col">
                                                      <div className="board-col-header"><h3>📢 공지사항</h3><Link to="/board/notice" className="more-link">더보기</Link></div>
                                            {posts.notice.map(p => <Link key={p.id} to={`/post/${p.id}`} className="post-item"><span className="post-title">{p.title}</span><span className="post-date">{new Date(p.created_at).toLocaleDateString('ko-KR')}</span></Link>)}
                                          </div>
                                          <div className="board-col">
                                                      <div className="board-col-header"><h3>🎉 이벤트</h3><Link to="/board/event" className="more-link">더보기</Link></div>
                                            {posts.event.map(p => <Link key={p.id} to={`/post/${p.id}`} className="post-item"><span className="post-title">{p.title}</span><span className="post-date">{new Date(p.created_at).toLocaleDateString('ko-KR')}</span></Link>)}
                                          </div>
                                          <div className="board-col">
                                                      <div className="board-col-header"><h3>💬 자유게시판</h3><Link to="/board/free" className="more-link">더보기</Link></div>
                                            {posts.free.map(p => <Link key={p.id} to={`/post/${p.id}`} className="post-item"><span className="post-title">{p.title}</span><span className="post-date">{new Date(p.created_at).toLocaleDateString('ko-KR')}</span></Link>)}
                                          </div>
                                </div>
                        </section>
                      ),
                banner: settings.banner_visible !== 'false' && <div key="banner" />,
          }
            
              return (
                    <div className="home">
                      {settings.popup_enabled !== 'false' && <PopupModal />}
                      {sectionOrder.map(key => sectionMap[key] || null)}
                      {settings.chat_enabled !== 'false' && (
                                <div style={getChatStyle()}>
                                              <ChatRoom />
                                </div>
                              )}
                    </div>
                  )
}
