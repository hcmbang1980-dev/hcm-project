import React, { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ChatRoom from '../components/ChatRoom'
import PopupModal from '../components/PopupModal'
import './HomePage.css'

const PLACES = [
  { icon: '🎤', name: '핫가라 & 트월 가라오케', path: '/places/karaoke', key: 'karaoke' },
  { icon: '🍺', name: '클럽 & 바', path: '/places/club', key: 'club' },
  { icon: '💆', name: '전견마사지 & 이발소', path: '/places/massage', key: 'massage' },
  { icon: '💋', name: '전견마사지', path: '/places/adult-massage', key: 'adult' },
  { icon: '🏠', name: '풀빌라 & 에어비앤비', path: '/places/villa', key: 'villa' },
  { icon: '🚗', name: '렌트카 & 운전기사', path: '/places/rent', key: 'rent' },
  { icon: '🍜', name: '맛집', path: '/places/restaurant', key: 'food' },
]

const DEFAULT_STATS = { members: 330, online: 15, todayVisits: 70, totalVisits: 7000 }
const DEFAULT_LABELS = { members: '가입인원', online: '실시간 접속', todayVisits: '당일 방문자', totalVisits: '누적방문자수' }

// 채팅창 위치 스타일 매핑
const CHAT_POSITION_STYLES = {
  'bottom-right': { position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 },
  'bottom-left':  { position: 'fixed', bottom: '20px', left: '20px', zIndex: 1000 },
  'top-right':    { position: 'fixed', top: '80px', right: '20px', zIndex: 1000 },
  'top-left':     { position: 'fixed', top: '80px', left: '20px', zIndex: 1000 },
}

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState({ notice: [], event: [], free: [] })
  const [stats, setStats] = useState(DEFAULT_STATS)
  const [labels, setLabels] = useState(DEFAULT_LABELS)
  const [activePlace, setActivePlace] = useState(null)
  const [placeImages, setPlaceImages] = useState([])
  const visitTrackedRef = useRef(false)

  // UI 설정 상태
  const [uiSettings, setUiSettings] = useState({
    chat_position: 'bottom-right',
    chat_visible: true,
    hero_layout: 'default',
    stats_visible: true,
    notice_visible: true,
    banner_visible: true,
    main_sections_order: 'hero,stats,notice,board,banner'
  })

  useEffect(() => {
    fetchPosts()
    fetchStats()
    fetchUiSettings()
    if (user && !visitTrackedRef.current) {
      visitTrackedRef.current = true
      trackVisit()
    }
  }, [user])

  useEffect(() => {
    const channel = supabase
      .channel('online-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_sessions' }, () => {
        fetchOnlineCount()
      })
      .subscribe()
    fetchOnlineCount()
    return () => supabase.removeChannel(channel)
  }, [])

  // UI 설정 불러오기
  const fetchUiSettings = async () => {
    try {
      const { data } = await supabase.from('site_settings').select('*').eq('id', 1).single()
      if (data) setUiSettings(data)
    } catch (e) {}
  }

  useEffect(() => {
    if (activePlace) {
      fetchPlaceImages(activePlace.key)
    }
  }, [activePlace])

  const fetchPlaceImages = async (placeKey) => {
    const { data } = await supabase
      .from('place_images')
      .select('*')
      .eq('place_key', placeKey)
      .order('created_at', { ascending: true })
      .limit(12)
    setPlaceImages(data || [])
  }

  const fetchOnlineCount = async () => {
    const threshold = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('online_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('last_seen', threshold)
    setStats(prev => ({ ...prev, online: DEFAULT_STATS.online + (count || 0) }))
  }

  const trackVisit = async () => {
    if (!user) return
    try {
      await supabase.from('online_sessions').upsert({
        user_id: user.id,
        last_seen: new Date().toISOString(),
        nickname: user.nickname || user.telegram_first_name || '회원'
      }, { onConflict: 'user_id' })

      const today = new Date().toISOString().split('T')[0]
      const { data: existing } = await supabase
        .from('visitor_stats')
        .select('total_visits')
        .eq('date', today)
      
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
        setStats(prev => ({
          ...prev,
          members: siteData.base_members || DEFAULT_STATS.members,
          totalVisits: siteData.total_visitors || DEFAULT_STATS.totalVisits,
        }))

        const baseMembers = siteData?.base_members || DEFAULT_STATS.members
        const { count: userCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
        setStats(prev => ({ ...prev, members: baseMembers + (userCount || 0) }))

        const today = new Date().toISOString().split('T')[0]
        const { data: todayData } = await supabase
          .from('visitor_stats')
          .select('total_visits')
          .eq('date', today)
          .single()
        if (todayData) setStats(prev => ({ ...prev, todayVisits: todayData.total_visits }))
      }
    } catch (e) {}
  }

  const renderStats = () => (
    <div className="stats-bar">
      <div className="stat-item">
        <span className="stat-num gold-text">{stats.members.toLocaleString()}+</span>
        <span className="stat-label">{labels.members}</span>
      </div>
      <div className="stat-divider"></div>
      <div className="stat-item">
        <span className="stat-num gold-text">{stats.online.toLocaleString()}+</span>
        <span className="stat-label">{labels.online}</span>
      </div>
      <div className="stat-divider"></div>
      <div className="stat-item">
        <span className="stat-num gold-text">{stats.todayVisits.toLocaleString()}+</span>
        <span className="stat-label">{labels.todayVisits}</span>
      </div>
      <div className="stat-divider"></div>
      <div className="stat-item">
        <span className="stat-num gold-text">{stats.totalVisits.toLocaleString()}+</span>
        <span className="stat-label">{labels.totalVisits}</span>
      </div>
    </div>
  )

  // 섹션 순서에 따라 렌더링
  const sectionOrder = (uiSettings.main_sections_order || 'hero,stats,notice,board,banner').split(',').map(s => s.trim())

  const sectionMap = {
    hero: !user && (
      <section key="hero" className={`hero hero-${uiSettings.hero_layout || 'default'}`}>
        <div className="hero-bg"></div>
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="gold-text">호치민 동룡 커뮤니티</span>
            <br />NO.1
          </h1>
          <p className="hero-subtitle">실시간으로 만나는 호치민 발로뛰 핫링<br />지금 바로 [호치민발양관] 텔레그렇으로 회회가입!</p>
          <div className="hero-buttons">
            <Link to="/login" className="btn-gold hero-btn">🔥 텔레그렇으로 회회가입</Link>
            <Link to="/board/free" className="hero-btn-outline">🔥 커뮤니티 보기</Link>
          </div>
        </div>
      </section>
    ),
    stats: uiSettings.stats_visible !== false && (
      <div key="stats">
        {renderStats()}
      </div>
    ),
    notice: uiSettings.notice_visible !== false && (
      <section key="notice" className="places-section">
        <div className="places-grid">
          {PLACES.map(place => (
            <div
              key={place.key}
              className={`place-card${activePlace?.key === place.key ? ' active' : ''}`}
              onClick={() => setActivePlace(activePlace?.key === place.key ? null : place)}
            >
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
            ) : (
              <p className="no-images">등록된 사진이 없습니다.</p>
            )}
          </div>
        )}
      </section>
    ),
    board: (
      <section key="board" className="board-section">
        <div className="board-grid">
          <div className="board-col">
            <div className="board-col-header">
              <h3>📢 공지사항</h3>
              <Link to="/board/notice" className="more-link">더보기</Link>
            </div>
            {posts.notice.map(p => (
              <Link key={p.id} to={`/post/${p.id}`} className="post-item">
                <span className="post-title">{p.title}</span>
                <span className="post-date">{new Date(p.created_at).toLocaleDateString('ko-KR')}</span>
              </Link>
            ))}
          </div>
          <div className="board-col">
            <div className="board-col-header">
              <h3>🎉 이벤트</h3>
              <Link to="/board/event" className="more-link">더보기</Link>
            </div>
            {posts.event.map(p => (
              <Link key={p.id} to={`/post/${p.id}`} className="post-item">
                <span className="post-title">{p.title}</span>
                <span className="post-date">{new Date(p.created_at).toLocaleDateString('ko-KR')}</span>
              </Link>
            ))}
          </div>
          <div className="board-col">
            <div className="board-col-header">
              <h3>💬 자유게시판</h3>
              <Link to="/board/free" className="more-link">더보기</Link>
            </div>
            {posts.free.map(p => (
              <Link key={p.id} to={`/post/${p.id}`} className="post-item">
                <span className="post-title">{p.title}</span>
                <span className="post-date">{new Date(p.created_at).toLocaleDateString('ko-KR')}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    ),
    banner: uiSettings.banner_visible !== false && (
      <div key="banner" />
    ),
  }

  return (
    <div className="home">
      <PopupModal />

      {sectionOrder.map(key => sectionMap[key] || null)}

      {/* 채팅창 - site_settings의 chat_visible, chat_position 적용 */}
      {uiSettings.chat_visible !== false && (
        <div style={CHAT_POSITION_STYLES[uiSettings.chat_position] || CHAT_POSITION_STYLES['bottom-right']}>
          <ChatRoom />
        </div>
      )}
    </div>
  )
}
