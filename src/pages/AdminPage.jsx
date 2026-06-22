import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { updateSettings, getSettings } from '../services/settingsService'
import './AdminPage.css'

const ROLE_LABELS = { admin: '관리자', moderator: '커뮤니티 관리자', user: '일반 유저' }
const ROLE_COLORS = { admin: '#ff4444', moderator: '#d4af37', user: '#888888' }

const LEVEL_OPTIONS = ['새싹', '씨앗', '나무', '열매', '뿌리', '숲', '정글', '마스터']

const TABS = [
  { key: 'members', label: '👥 회원 관리' },
  { key: 'stats', label: '📊 통계 수치' },
  { key: 'popups', label: '🪟 팝업 관리' },
  { key: 'ads', label: '📢 광고 관리' },
  { key: 'ui', label: '🎨 UI 설정' },
  ]

// ===== PIN 입력 화면 컴포넌트 =====
function AdminPinGate({ onSuccess }) {
    const [pin, setPin] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [attempts, setAttempts] = useState(0)
    const [locked, setLocked] = useState(false)
    const [lockTimer, setLockTimer] = useState(0)

  useEffect(() => {
        let interval
        if (locked && lockTimer > 0) {
                interval = setInterval(() => {
                          setLockTimer(prev => {
                                      if (prev <= 1) { setLocked(false); clearInterval(interval); return 0 }
                                      return prev - 1
                          })
                }, 1000)
        }
        return () => clearInterval(interval)
  }, [locked, lockTimer])

  const handleSubmit = async (e) => {
        e.preventDefault()
        if (locked) return
        if (!pin.trim()) { setError('PIN을 입력하세요'); return }
        setLoading(true)
        setError('')
        try {
                const { data } = await supabase
                  .from('site_stats')
                  .select('admin_pin')
                  .eq('id', 1)
                  .single()
                if (data && data.admin_pin && data.admin_pin === pin.trim()) {
                          const expiry = Date.now() + 30 * 60 * 1000
                          sessionStorage.setItem('admin_pin_verified', expiry.toString())
                          onSuccess()
                } else {
                          const newAttempts = attempts + 1
                          setAttempts(newAttempts)
                          if (newAttempts >= 5) {
                                      setLocked(true)
                                      setLockTimer(300)
                                      setError('5회 틀렸습니다. 5분 후 다시 시도하세요.')
                          } else {
                                      setError(`PIN이 틀렸습니다. (${newAttempts}/5회)`)
                          }
                          setPin('')
                }
        } catch (err) {
                setError('인증 오류가 발생했습니다.')
        }
        setLoading(false)
  }

  return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#1a1a1a', border: '2px solid #d4af37', borderRadius: '16px', padding: '48px 40px', width: '100%', maxWidth: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
                          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                                      <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔐</div>
                                      <h1 style={{ color: '#d4af37', fontSize: '22px', fontWeight: 'bold', marginBottom: '8px' }}>관리자 인증</h1>
                                      <p style={{ color: '#666', fontSize: '14px' }}>관리자 PIN을 입력하세요</p>
                          </div>
                          <form onSubmit={handleSubmit}>
                                      <input
                                                    type="password"
                                                    value={pin}
                                                    onChange={e => setPin(e.target.value)}
                                                    placeholder="PIN 입력"
                                                    disabled={locked || loading}
                                                    maxLength={20}
                                                    style={{ width: '100%', padding: '14px 16px', background: '#222', color: '#fff', border: error ? '2px solid #ff4444' : '2px solid #444', borderRadius: '8px', fontSize: '18px', letterSpacing: '4px', textAlign: 'center', marginBottom: '16px', boxSizing: 'border-box', outline: 'none' }}
                                                    autoFocus
                                                  />
                            {error && <div style={{ background: '#2a1010', border: '1px solid #ff4444', borderRadius: '8px', padding: '10px 14px', color: '#ff6666', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>{error}</div>}
                            {locked && <div style={{ color: '#ff9944', textAlign: 'center', marginBottom: '12px', fontSize: '14px' }}>잠금 해제까지: {Math.floor(lockTimer/60)}:{String(lockTimer%60).padStart(2,'0')}</div>}
                                      <button type="submit" disabled={locked || loading} style={{ width: '100%', padding: '14px', background: locked ? '#333' : '#d4af37', color: locked ? '#666' : '#000', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: locked ? 'not-allowed' : 'pointer' }}>
                                        {loading ? '확인 중...' : locked ? '잠금됨' : '확인'}
                                      </button>
                          </form>
                </div>
        </div>
      )
}

// ===== 메인 관리자 컴포넌트 =====
export default function AdminPage() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [pinVerified, setPinVerified] = useState(false)
    const [activeTab, setActiveTab] = useState('members')
    const [toast, setToast] = useState(null)

  // 회원 관리
  const [users, setUsers] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [filterRole, setFilterRole] = useState('all')
    const [savingUser, setSavingUser] = useState(null)

  // 통계
  const [siteStats, setSiteStats] = useState({ members_base: 330, online_base: 15, today_base: 70, total_base: 13000, members_label: '가입인원', online_label: '실시간 접속', today_label: '당일 방문자', total_label: '누적방문자수' })

  // 팝업
  const [popups, setPopups] = useState([])
    const [newPopup, setNewPopup] = useState({ title: '', content: '', link_url: '', is_active: true })

  // 광고
  const [ads, setAds] = useState([])
    const [newAd, setNewAd] = useState({ title: '', image_url: '', link_url: '', position: 'top', is_active: true })

  // UI 설정
  const [uiSettings, setUiSettings] = useState({
        chat_enabled: 'true',
        chat_position: 'inline',
        stats_visible: 'true',
        notice_visible: 'true',
        banner_visible: 'true',
        hero_layout: 'default',
        main_sections_order: 'hero,stats,notice,board,banner',
  })

  useEffect(() => {
        const stored = sessionStorage.getItem('admin_pin_verified')
        if (stored && Date.now() < parseInt(stored)) {
                setPinVerified(true)
        }
  }, [])

  useEffect(() => {
        if (!user) { navigate('/'); return }
        if (user.role !== 'admin') { navigate('/'); return }
  }, [user])

  useEffect(() => {
        if (pinVerified) {
                fetchUsers()
                fetchSiteStats()
                fetchPopups()
                fetchAds()
                fetchUiSettings()
        }
  }, [pinVerified])

  const showToast = (msg, type = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
  }

  // ===== 회원 관리 =====
  const fetchUsers = async () => {
        const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
        setUsers(data || [])
  }

  const saveUserChanges = async (u) => {
        setSavingUser(u.id)
        try {
                const { error } = await supabase
                  .from('users')
                  .update({ role: u.role, level: u.level })
                  .eq('id', u.id)
                if (error) throw error
                showToast(`${u.nickname} 저장 완료!`)
                fetchUsers()
        } catch (e) {
                showToast('저장 실패: ' + e.message, 'error')
        }
        setSavingUser(null)
  }

  const filteredUsers = users.filter(u => {
        const matchSearch = !searchQuery || (u.nickname || '').includes(searchQuery) || (u.telegram_id || '').includes(searchQuery)
        const matchRole = filterRole === 'all' || u.role === filterRole
        return matchSearch && matchRole
  })

  // ===== 통계 수치 =====
  const fetchSiteStats = async () => {
        const { data } = await supabase.from('site_stats').select('*').eq('id', 1).single()
        if (data) {
                setSiteStats({
                                  members_base: data.members_base ?? data.base_members ?? 330,
                                  online_base: data.online_base ?? data.base_online ?? 15,
                                  today_base: data.today_base ?? data.base_today ?? 70,
                                  total_base: data.total_base ?? data.base_total ?? data.total_visitors ?? 13000,
                                  members_label: data.members_label ?? data.label_members ?? '가입인원',
                                  online_label: data.online_label ?? data.label_online ?? '실시간 접속',
                                  today_label: data.today_label ?? data.label_today ?? '당일 방문자',
                                  total_label: data.total_label ?? data.label_total ?? '누적방문자수',
                })
        }
  }

  const saveSiteStats = async () => {
        const { error } = await supabase.from('site_stats').upsert({
                id: 1,
                members_base: parseInt(siteStats.members_base) || 0,
                online_base: parseInt(siteStats.online_base) || 0,
                today_base: parseInt(siteStats.today_base) || 0,
                total_base: parseInt(siteStats.total_base) || 0,
                members_label: siteStats.members_label,
                online_label: siteStats.online_label,
                today_label: siteStats.today_label,
                total_label: siteStats.total_label,
        }, { onConflict: 'id' })
        if (error) { showToast('저장 실패: ' + error.message, 'error'); return }
        showToast('통계 수치 저장 완료!')
  }

  // ===== 팝업 관리 =====
  const fetchPopups = async () => {
        const { data } = await supabase.from('popups').select('*').order('created_at', { ascending: false })
        setPopups(data || [])
  }

  const addPopup = async () => {
        if (!newPopup.title) { showToast('제목을 입력하세요', 'error'); return }
        const { error } = await supabase.from('popups').insert([newPopup])
        if (error) { showToast('추가 실패', 'error'); return }
        setNewPopup({ title: '', content: '', link_url: '', is_active: true })
        showToast('팝업 추가 완료!')
        fetchPopups()
  }

  const togglePopup = async (id, is_active) => {
        await supabase.from('popups').update({ is_active: !is_active }).eq('id', id)
        fetchPopups()
  }

  const deletePopup = async (id) => {
        if (!window.confirm('팝업을 삭제하시겠습니까?')) return
        await supabase.from('popups').delete().eq('id', id)
        showToast('팝업 삭제 완료!')
        fetchPopups()
  }

  // ===== 광고 관리 =====
  const fetchAds = async () => {
        const { data } = await supabase.from('ads').select('*').order('created_at', { ascending: false })
        setAds(data || [])
  }

  const addAd = async () => {
        if (!newAd.title) { showToast('제목을 입력하세요', 'error'); return }
        const { error } = await supabase.from('ads').insert([newAd])
        if (error) { showToast('추가 실패', 'error'); return }
        setNewAd({ title: '', image_url: '', link_url: '', position: 'top', is_active: true })
        showToast('광고 추가 완료!')
        fetchAds()
  }

  const toggleAd = async (id, is_active) => {
        await supabase.from('ads').update({ is_active: !is_active }).eq('id', id)
        fetchAds()
  }

  const deleteAd = async (id) => {
        if (!window.confirm('광고를 삭제하시겠습니까?')) return
        await supabase.from('ads').delete().eq('id', id)
        showToast('광고 삭제 완료!')
        fetchAds()
  }

  // ===== UI 설정 =====
  const fetchUiSettings = async () => {
        try {
                const data = await getSettings()
                if (data && Object.keys(data).length > 0) {
                          setUiSettings(prev => ({ ...prev, ...data }))
                }
        } catch (e) {}
  }

  const saveUiSettings = async () => {
        try {
                await updateSettings(uiSettings)
                showToast('UI 설정 저장 완료!')
        } catch (e) {
                showToast('UI 설정 저장 실패: ' + e.message, 'error')
        }
  }

  if (!pinVerified) return <AdminPinGate onSuccess={() => setPinVerified(true)} />

  const adminCounts = {
        all: users.length,
        admin: users.filter(u => u.role === 'admin').length,
        moderator: users.filter(u => u.role === 'moderator').length,
        user: users.filter(u => u.role === 'user').length,
  }

  return (
        <div className="admin-page">
          {toast && (
                  <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, background: toast.type === 'error' ? '#ff4444' : '#22c55e', color: '#fff', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
                    {toast.msg}
                  </div>
              )}
              <div className="admin-header">
                      <h1>🔧 관리자 페이지</h1>
                      <p>사이트 전체를 관리하세요</p>
              </div>
              <div className="admin-tabs">
                {TABS.map(tab => (
                    <button key={tab.key} className={`admin-tab-btn ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
                      {tab.label}
                    </button>
                  ))}
              </div>
              <div className="admin-content">
              
                {/* ===== 회원 관리 탭 ===== */}
                {activeTab === 'members' && (
                    <div>
                                <h2>👥 회원 관리</h2>
                                <div className="member-filter-counts" style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                                  {[['all', '전체', adminCounts.all], ['admin', '관리자', adminCounts.admin], ['moderator', '커뮤니티관리자', adminCounts.moderator], ['user', '일반유저', adminCounts.user]].map(([key, label, count]) => (
                                      <button key={key} onClick={() => setFilterRole(key)} style={{ padding: '8px 16px', background: filterRole === key ? '#d4af37' : '#222', color: filterRole === key ? '#000' : '#d4af37', border: '1px solid #d4af37', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                        {count} {label}
                                      </button>
                                    ))}
                                </div>
                                <input
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                placeholder="닉네임 또는 텔레그램 아이디 검색..."
                                                style={{ width: '100%', padding: '10px 14px', background: '#1a1a1a', border: '1px solid #444', color: '#fff', borderRadius: '8px', marginBottom: '16px', boxSizing: 'border-box' }}
                                              />
                                <div style={{ overflowX: 'auto' }}>
                                              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                              <thead>
                                                                                <tr style={{ borderBottom: '2px solid #d4af37' }}>
                                                                                                    <th style={{ padding: '10px', textAlign: 'left', color: '#d4af37' }}>닉네임</th>th>
                                                                                                    <th style={{ padding: '10px', textAlign: 'left', color: '#d4af37' }}>텔레그램</th>th>
                                                                                                    <th style={{ padding: '10px', textAlign: 'left', color: '#d4af37' }}>역할</th>th>
                                                                                                    <th style={{ padding: '10px', textAlign: 'left', color: '#d4af37' }}>레벨</th>th>
                                                                                                    <th style={{ padding: '10px', textAlign: 'left', color: '#d4af37' }}>가입일</th>th>
                                                                                                    <th style={{ padding: '10px', textAlign: 'left', color: '#d4af37' }}>저장</th>th>
                                                                                </tr>
                                                              </thead>thead>
                                                              <tbody>
                                                                {filteredUsers.map(u => (
                                          <MemberRow
                                                                  key={u.id}
                                                                  u={u}
                                                                  onSave={saveUserChanges}
                                                                  saving={savingUser === u.id}
                                                                />
                                        ))}
                                                              </tbody>tbody>
                                              </table>
                                </div>
                    </div>
                      )}
              
                {/* ===== 통계 수치 탭 ===== */}
                {activeTab === 'stats' && (
                    <div>
                                <h2>📊 통계 수치 관리</h2>
                                <p style={{ color: '#888', marginBottom: '20px' }}>표시 텍스트</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                  {[
                                      ['members_label', 'members_base', '가입인원'],
                                      ['online_label', 'online_base', '실시간 접속'],
                                      ['today_label', 'today_base', '당일 방문자'],
                                      ['total_label', 'total_base', '누적방문자수'],
                                    ].map(([labelKey, baseKey, placeholder]) => (
                                                      <div key={labelKey} style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px', border: '1px solid #333' }}>
                                                                        <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>표시 텍스트</label>
                                                                        <input
                                                                                              value={siteStats[labelKey] || ''}
                                                                                              onChange={e => setSiteStats(prev => ({ ...prev, [labelKey]: e.target.value }))}
                                                                                              placeholder={placeholder}
                                                                                              style={{ width: '100%', padding: '8px 12px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '6px', boxSizing: 'border-box', marginBottom: '8px' }}
                                                                                            />
                                                                        <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>기본 수치</label>
                                                                        <input
                                                                                              type="number"
                                                                                              value={siteStats[baseKey] || 0}
                                                                                              onChange={e => setSiteStats(prev => ({ ...prev, [baseKey]: e.target.value }))}
                                                                                              style={{ width: '100%', padding: '8px 12px', background: '#222', border: '1px solid #444', color: '#d4af37', borderRadius: '6px', boxSizing: 'border-box' }}
                                                                                            />
                                                      </div>
                                                    ))}
                                </div>
                                <button onClick={saveSiteStats} style={{ background: '#d4af37', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
                                              💾 저장
                                </button>
                    </div>
                      )}
              
                {/* ===== 팝업 관리 탭 ===== */}
                {activeTab === 'popups' && (
                    <div>
                                <h2>🪟 팝업 관리</h2>
                                <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '10px', border: '1px solid #333', marginBottom: '24px' }}>
                                              <h3 style={{ color: '#d4af37', marginBottom: '16px' }}>새 팝업 추가</h3>
                                              <input value={newPopup.title} onChange={e => setNewPopup(p => ({ ...p, title: e.target.value }))} placeholder="팝업 제목" style={{ width: '100%', padding: '8px 12px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '6px', boxSizing: 'border-box', marginBottom: '10px' }} />
                                              <textarea value={newPopup.content} onChange={e => setNewPopup(p => ({ ...p, content: e.target.value }))} placeholder="팝업 내용" rows={4} style={{ width: '100%', padding: '8px 12px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '6px', boxSizing: 'border-box', marginBottom: '10px', resize: 'vertical' }} />
                                              <input value={newPopup.link_url} onChange={e => setNewPopup(p => ({ ...p, link_url: e.target.value }))} placeholder="링크 URL (선택)" style={{ width: '100%', padding: '8px 12px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '6px', boxSizing: 'border-box', marginBottom: '10px' }} />
                                              <button onClick={addPopup} style={{ background: '#d4af37', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>+ 팝업 추가</button>
                                </div>
                      {popups.map(p => (
                                    <div key={p.id} style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px', border: '1px solid #333', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                                      <div style={{ fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>{p.title}</div>
                                                                      <div style={{ color: '#888', fontSize: '13px' }}>{p.content?.substring(0, 60)}...</div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                                      <button onClick={() => togglePopup(p.id, p.is_active)} style={{ background: p.is_active ? '#22c55e' : '#555', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>{p.is_active ? '활성' : '비활성'}</button>
                                                                      <button onClick={() => deletePopup(p.id)} style={{ background: '#ff4444', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>삭제</button>
                                                    </div>
                                    </div>
                                  ))}
                      {popups.length === 0 && <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>등록된 팝업이 없습니다.</p>}
                    </div>
                      )}
              
                {/* ===== 광고 관리 탭 ===== */}
                {activeTab === 'ads' && (
                    <div>
                                <h2>📢 광고 관리</h2>
                                <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '10px', border: '1px solid #333', marginBottom: '24px' }}>
                                              <h3 style={{ color: '#d4af37', marginBottom: '16px' }}>새 광고 추가</h3>
                                              <input value={newAd.title} onChange={e => setNewAd(a => ({ ...a, title: e.target.value }))} placeholder="광고 제목" style={{ width: '100%', padding: '8px 12px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '6px', boxSizing: 'border-box', marginBottom: '10px' }} />
                                              <input value={newAd.image_url} onChange={e => setNewAd(a => ({ ...a, image_url: e.target.value }))} placeholder="이미지 URL" style={{ width: '100%', padding: '8px 12px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '6px', boxSizing: 'border-box', marginBottom: '10px' }} />
                                              <input value={newAd.link_url} onChange={e => setNewAd(a => ({ ...a, link_url: e.target.value }))} placeholder="링크 URL" style={{ width: '100%', padding: '8px 12px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '6px', boxSizing: 'border-box', marginBottom: '10px' }} />
                                              <select value={newAd.position} onChange={e => setNewAd(a => ({ ...a, position: e.target.value }))} style={{ width: '100%', padding: '8px 12px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '6px', marginBottom: '10px' }}>
                                                              <option value="top">상단</option>
                                                              <option value="bottom">하단</option>
                                                              <option value="sidebar">사이드바</option>
                                              </select>
                                              <button onClick={addAd} style={{ background: '#d4af37', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>+ 광고 추가</button>
                                </div>
                      {ads.map(a => (
                                    <div key={a.id} style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px', border: '1px solid #333', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                                      <div style={{ fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>{a.title}</div>
                                                                      <div style={{ color: '#888', fontSize: '13px' }}>{a.position} | {a.link_url}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                                      <button onClick={() => toggleAd(a.id, a.is_active)} style={{ background: a.is_active ? '#22c55e' : '#555', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>{a.is_active ? '활성' : '비활성'}</button>
                                                                      <button onClick={() => deleteAd(a.id)} style={{ background: '#ff4444', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>삭제</button>
                                                    </div>
                                    </div>
                                  ))}
                      {ads.length === 0 && <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>등록된 광고가 없습니다.</p>}
                    </div>
                      )}
              
                {/* ===== UI 설정 탭 ===== */}
                {activeTab === 'ui' && (
                    <div>
                                <h2>🎨 UI 설정</h2>
                                <p style={{ color: '#888', marginBottom: '20px' }}>메인화면 레이아웃, 채팅창 위치 등 사이트 UI를 어드민에서 직접 제어합니다.</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                              <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '10px', border: '1px solid #333' }}>
                                                              <h3 style={{ color: '#d4af37', marginBottom: '16px' }}>💬 채팅창 설정</h3>
                                                              <div style={{ marginBottom: '16px' }}>
                                                                                <label style={{ color: '#aaa', fontSize: '13px', display: 'block', marginBottom: '8px' }}>채팅창 표시</label>
                                                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                                                                    <button onClick={() => setUiSettings(s => ({ ...s, chat_enabled: 'true' }))} style={{ flex: 1, padding: '10px', background: uiSettings.chat_enabled === 'true' ? '#d4af37' : '#333', color: uiSettings.chat_enabled === 'true' ? '#000' : '#aaa', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>표시</button>
                                                                                                    <button onClick={() => setUiSettings(s => ({ ...s, chat_enabled: 'false' }))} style={{ flex: 1, padding: '10px', background: uiSettings.chat_enabled === 'false' ? '#666' : '#333', color: uiSettings.chat_enabled === 'false' ? '#fff' : '#aaa', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>숨김</button>
                                                                                </div>
                                                              </div>
                                                              <div style={{ marginBottom: '16px' }}>
                                                                                <label style={{ color: '#aaa', fontSize: '13px', display: 'block', marginBottom: '8px' }}>채팅창 위치</label>
                                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                                                  {[['inline', '메인화면 인라인'], ['bottom-right', '우측 하단'], ['bottom-left', '좌측 하단'], ['top-right', '우측 상단']].map(([val, label]) => (
                                            <button key={val} onClick={() => setUiSettings(s => ({ ...s, chat_position: val }))} style={{ padding: '8px', background: uiSettings.chat_position === val ? '#d4af37' : '#333', color: uiSettings.chat_position === val ? '#000' : '#aaa', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>{label}</button>
                                          ))}
                                                                                </div>
                                                              </div>
                                              </div>
                                              <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '10px', border: '1px solid #333' }}>
                                                              <h3 style={{ color: '#d4af37', marginBottom: '16px' }}>🏠 메인화면 섹션</h3>
                                                {[['stats_visible', '통계 섹션'], ['notice_visible', '공지사항'], ['banner_visible', '배너']].map(([key, label]) => (
                                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                            <span style={{ color: '#fff' }}>{label}</span>
                                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                                                  <button onClick={() => setUiSettings(s => ({ ...s, [key]: 'true' }))} style={{ padding: '6px 14px', background: uiSettings[key] === 'true' ? '#d4af37' : '#333', color: uiSettings[key] === 'true' ? '#000' : '#aaa', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>표시</button>
                                                                                  <button onClick={() => setUiSettings(s => ({ ...s, [key]: 'false' }))} style={{ padding: '6px 14px', background: uiSettings[key] === 'false' ? '#555' : '#333', color: uiSettings[key] === 'false' ? '#fff' : '#aaa', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>숨김</button>
                                                            </div>
                                        </div>
                                      ))}
                                              </div>
                                </div>
                                <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '10px', border: '1px solid #333', marginBottom: '20px' }}>
                                              <h3 style={{ color: '#d4af37', marginBottom: '12px' }}>📋 메인 섹션 순서 (쉼표로 구분)</h3>
                                              <input value={uiSettings.main_sections_order || ''} onChange={e => setUiSettings(s => ({ ...s, main_sections_order: e.target.value }))} placeholder="hero,stats,notice,board,banner" style={{ width: '100%', padding: '10px 14px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '6px', boxSizing: 'border-box', marginBottom: '8px' }} />
                                              <p style={{ color: '#666', fontSize: '12px' }}>예: hero,stats,notice,board,banner (사용 가능: hero, stats, notice, board, banner)</p>
                                </div>
                                <button onClick={saveUiSettings} style={{ background: '#d4af37', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
                                              💾 UI 설정 저장
                                </button>
                    </div>
                      )}
              </div>
        </div>
      )
}

// ===== 개별 회원 행 컴포넌트 (역할+레벨 로컬 수정 후 저장) =====
function MemberRow({ u, onSave, saving }) {
    const [role, setRole] = useState(u.role || 'user')
    const [level, setLevel] = useState(u.level || '새싹')

  const handleSave = () => {
        onSave({ ...u, role, level })
  }

  const joinDate = u.created_at ? new Date(u.created_at).toLocaleDateString('ko-KR') : '-'

  return (
        <tr style={{ borderBottom: '1px solid #333' }}>
                <td style={{ padding: '10px', color: '#fff' }}>{u.nickname || u.telegram_first_name || '-'}</td>
                <td style={{ padding: '10px', color: '#888' }}>@{u.telegram_id || '-'}</td>
                <td style={{ padding: '10px' }}>
                          <select
                                      value={role}
                                      onChange={e => setRole(e.target.value)}
                                      style={{ background: '#222', color: ROLE_COLORS[role] || '#fff', border: '1px solid #444', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}
                                    >
                                    <option value="user">일반 유저</option>
                                    <option value="moderator">커뮤니티 관리자</option>
                                    <option value="admin">관리자</option>
                          </select>
                </td>
              <td style={{ padding: '10px' }}>
                      <select
                                  value={level}
                                  onChange={e => setLevel(e.target.value)}
                                  style={{ background: '#222', color: '#d4af37', border: '1px solid #444', padding: '4px 8px', borderRadius: '4px' }}
                                >
                        {LEVEL_OPTIONS.map(lv => (
                                              <option key={lv} value={lv}>{lv}</option>
                                            ))}
                      </select>
              </td>
              <td style={{ padding: '10px', color: '#666', fontSize: '13px' }}>{joinDate}</td>
              <td style={{ padding: '10px' }}>
                      <button
                                  onClick={handleSave}
                                  disabled={saving}
                                  style={{ background: saving ? '#555' : '#d4af37', color: saving ? '#aaa' : '#000', border: 'none', padding: '6px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '13px' }}
                                >
                        {saving ? '저장중...' : '💾 저장'}
                      </button>
              </td>
        </tr>
      )
}
