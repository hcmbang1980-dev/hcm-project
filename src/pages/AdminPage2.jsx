import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getSettings, updateSettings } from '../services/settingsService'
import { getUsers, banUser, unbanUser, changeRole, saveAdminMemo } from '../services/userService'
import { givePoint } from '../services/pointService'
import { getAdminLogs } from '../services/adminLogService'
import './AdminPage.css'

const TABS = [
  { key: 'dashboard', label: '📊 대시보드' },
  { key: 'members',   label: '👥 회원관리' },
  { key: 'points',    label: '💰 포인트관리' },
  { key: 'ads',       label: '📢 광고관리' },
  { key: 'settings',  label: '⚙️ 사이트설정' },
  { key: 'logs',      label: '📋 관리로그' },
  ]

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
        setLoading(true)
        setError('')
        try {
                const { data } = await supabase.from('site_stats').select('admin_pin').eq('id', 1).single()
                if (data && data.admin_pin === pin.trim()) {
                          sessionStorage.setItem('admin_pin_verified', (Date.now() + 30 * 60 * 1000).toString())
                          onSuccess()
                } else {
                          const n = attempts + 1
                          setAttempts(n)
                          if (n >= 5) { setLocked(true); setLockTimer(300); setError('5회 틀렸습니다. 5분 후 재시도.') }
                          else setError(`PIN 오류 (${n}/5)`)
                          setPin('')
                }
        } catch { setError('인증 오류') }
        setLoading(false)
  }

  return (
        <div style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ background:'#1a1a1a', border:'2px solid #d4af37', borderRadius:'16px', padding:'48px 40px', width:'100%', maxWidth:'380px' }}>
                          <div style={{ textAlign:'center', marginBottom:'32px' }}>
                                      <div style={{ fontSize:'48px' }}>🔐</div>div>
                                      <h1 style={{ color:'#d4af37', fontSize:'22px', marginBottom:'8px' }}>관리자 인증</h1>h1>
                                      <p style={{ color:'#666', fontSize:'14px' }}>관리자 PIN을 입력하세요</p>p>
                          </div>div>
                          <form onSubmit={handleSubmit}>
                                      <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="PIN 입력"
                                                    disabled={locked || loading} maxLength={20} autoFocus
                                                    style={{ width:'100%', padding:'14px 16px', background:'#222', color:'#fff', border:error?'2px solid #ff4444':'2px solid #444', borderRadius:'8px', fontSize:'18px', letterSpacing:'4px', textAlign:'center', marginBottom:'16px', boxSizing:'border-box' }} />
                            {error && <div style={{ background:'#2a1010', border:'1px solid #ff4444', borderRadius:'8px', padding:'10px', color:'#ff6b6b', fontSize:'13px', textAlign:'center', marginBottom:'16px' }}>{error}</div>div>}
                            {locked && <div style={{ textAlign:'center', color:'#ff4444', fontSize:'13px', marginBottom:'16px' }}>잠금 해제까지: {Math.floor(lockTimer/60)}:{String(lockTimer%60).padStart(2,'0')}</div>div>}
                                      <button type="submit" disabled={locked || loading}
                                                    style={{ width:'100%', padding:'14px', background:locked?'#333':'#d4af37', color:locked?'#666':'#000', border:'none', borderRadius:'8px', fontSize:'16px', fontWeight:'bold', cursor:locked?'not-allowed':'pointer' }}>
                                        {loading ? '인증 중...' : locked ? '잠금됨' : '확인'}
                                      </button>button>
                          </form>form>
                </div>div>
        </div>div>
      )
}

export default function AdminPage() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [pinVerified, setPinVerified] = useState(false)
    const [activeTab, setActiveTab] = useState('dashboard')
    const [toast, setToast] = useState(null)

  // 대시보드
  const [dashStats, setDashStats] = useState({ totalUsers: 0, bannedUsers: 0, totalPosts: 0, todayPosts: 0, pendingReports: 0 })

  // 회원관리
  const [users, setUsers] = useState([])
    const [loadingUsers, setLoadingUsers] = useState(false)
    const [search, setSearch] = useState('')
    const [banReason, setBanReason] = useState('')
    const [memoInputs, setMemoInputs] = useState({})
    const [pointInputs, setPointInputs] = useState({})
    const [pointReasons, setPointReasons] = useState({})

  // 광고관리
  const [ads, setAds] = useState([])
    const [adForm, setAdForm] = useState({ title:'', image_url:'', mobile_image_url:'', link_url:'', position:'popup', active:true, sort_order:0, close_hours:24 })

  // 사이트설정
  const [settings, setSettings] = useState({})
    const [savingSettings, setSavingSettings] = useState(false)

  // 관리로그
  const [logs, setLogs] = useState([])

  useEffect(() => {
        if (!user) { navigate('/login'); return }
        if (user.role !== 'admin') { navigate('/'); return }
        const stored = sessionStorage.getItem('admin_pin_verified')
        if (stored && parseInt(stored) > Date.now()) setPinVerified(true)
  }, [user])

  useEffect(() => {
        if (pinVerified) {
                fetchDashStats()
                fetchSettings()
        }
  }, [pinVerified])

  useEffect(() => {
        if (pinVerified && activeTab === 'members') fetchUsers()
        if (pinVerified && activeTab === 'ads') fetchAds()
        if (pinVerified && activeTab === 'logs') fetchLogs()
  }, [pinVerified, activeTab])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  // ===== 대시보드 =====
  const fetchDashStats = async () => {
        const [usersRes, postsRes, reportsRes] = await Promise.all([
                supabase.from('users').select('id, status', { count: 'exact' }),
                supabase.from('posts').select('id, created_at', { count: 'exact' }),
                supabase.from('reports').select('id', { count: 'exact' }).eq('status', 'pending'),
              ])
        const today = new Date().toISOString().split('T')[0]
        const todayPosts = (postsRes.data || []).filter(p => p.created_at?.startsWith(today)).length
        const banned = (usersRes.data || []).filter(u => u.status === 'banned').length
        setDashStats({
                totalUsers: usersRes.count || 0,
                bannedUsers: banned,
                totalPosts: postsRes.count || 0,
                todayPosts,
                pendingReports: reportsRes.count || 0,
        })
  }

  // ===== 회원관리 =====
  const fetchUsers = async () => {
        setLoadingUsers(true)
        const data = await getUsers(search)
        setUsers(data)
        setLoadingUsers(false)
  }

  const handleBan = async (u) => {
        const reason = banReason || '운영 규정 위반'
        const ok = await banUser(u, reason, user.nickname)
        if (ok) { showToast(`✅ ${u.nickname} 차단 완료`); fetchUsers() }
        else showToast('❌ 차단 실패')
  }

  const handleUnban = async (u) => {
        const ok = await unbanUser(u, user.nickname)
        if (ok) { showToast(`✅ ${u.nickname} 차단 해제`); fetchUsers() }
        else showToast('❌ 해제 실패')
  }

  const handleRoleChange = async (u, newRole) => {
        const ok = await changeRole(u.id, newRole, u.nickname, user.nickname)
        if (ok) { showToast('✅ 역할 변경 완료'); fetchUsers() }
        else showToast('❌ 변경 실패')
  }

  const handleGivePoint = async (u) => {
        const amount = parseInt(pointInputs[u.id] || 0)
        const reason = pointReasons[u.id] || '관리자 지급'
        if (!amount) return showToast('포인트를 입력하세요')
        const ok = await givePoint(u, amount, reason, user.nickname)
        if (ok) {
                showToast(`✅ ${u.nickname}에게 ${amount > 0 ? '+' : ''}${amount}P 지급 완료`)
                setPointInputs(p => ({ ...p, [u.id]: '' }))
                fetchUsers()
        } else showToast('❌ 지급 실패')
  }

  const handleSaveMemo = async (u) => {
        const memo = memoInputs[u.id] ?? u.admin_memo ?? ''
        const ok = await saveAdminMemo(u.id, memo)
        if (ok) showToast('✅ 메모 저장 완료')
        else showToast('❌ 저장 실패')
  }

  const filtered = users.filter(u =>
        (u.nickname || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.telegram_username || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.telegram_id || '').toString().includes(search)
                                  )

  // ===== 광고관리 =====
  const fetchAds = async () => {
        const { data } = await supabase.from('ads').select('*').order('sort_order', { ascending: true })
        setAds(data || [])
  }

  const addAd = async (e) => {
        e.preventDefault()
        const { error } = await supabase.from('ads').insert([adForm])
        if (!error) {
                showToast('✅ 광고 등록 완료')
                setAdForm({ title:'', image_url:'', mobile_image_url:'', link_url:'', position:'popup', active:true, sort_order:0, close_hours:24 })
                fetchAds()
        } else showToast('❌ ' + error.message)
  }

  const toggleAd = async (id, current) => {
        await supabase.from('ads').update({ active: !current }).eq('id', id)
        fetchAds()
        showToast(current ? '광고 비활성화' : '광고 활성화')
  }

  const deleteAd = async (id) => {
        if (!confirm('삭제하시겠습니까?')) return
        await supabase.from('ads').delete().eq('id', id)
        fetchAds()
        showToast('삭제되었습니다')
  }

  // ===== 사이트설정 =====
  const fetchSettings = async () => {
        const data = await getSettings()
        setSettings(data)
  }

  const saveSettings = async () => {
        setSavingSettings(true)
        await updateSettings(settings)
        setSavingSettings(false)
        showToast('✅ 설정 저장 완료!')
  }

  // ===== 관리로그 =====
  const fetchLogs = async () => {
        const data = await getAdminLogs(100)
        setLogs(data)
  }

  if (!user || user.role !== 'admin') return null
    if (!pinVerified) return <AdminPinGate onSuccess={() => setPinVerified(true)} />

  const ST = { background:'#1a1a1a', border:'1px solid #333', borderRadius:'12px', padding:'20px' }
    const INPUT = { width:'100%', padding:'8px 12px', background:'#222', color:'#fff', border:'1px solid #333', borderRadius:'6px', boxSizing:'border-box', fontSize:'13px' }
    const BTN = (col='#d4af37') => ({ background:col, color:col==='#d4af37'?'#000':'#fff', border:'none', borderRadius:'6px', padding:'6px 14px', cursor:'pointer', fontSize:'12px', fontWeight:'bold' })

  return (
        <div className="admin-page">
          {toast && (
                  <div style={{ position:'fixed', bottom:'32px', left:'50%', transform:'translateX(-50%)', background:'#222', color:'#fff', padding:'12px 28px', borderRadius:'50px', zIndex:9999, fontSize:'15px', border:'1px solid #d4af37' }}>
                    {toast}
                  </div>div>
              )}
        
              <div className="admin-header" style={{ position:'relative' }}>
                      <h1 className="admin-title">🔧 관리자 페이지</h1>h1>
                      <p className="admin-subtitle">호치민방앗간 CMS</p>p>
                      <button onClick={() => { sessionStorage.removeItem('admin_pin_verified'); setPinVerified(false) }}
                                  style={{ position:'absolute', right:'24px', top:'24px', background:'#333', color:'#888', border:'1px solid #444', borderRadius:'8px', padding:'8px 16px', cursor:'pointer', fontSize:'13px' }}>
                                🔒 잠금
                      </button>button>
              </div>div>
        
              <div className="admin-tabs">
                {TABS.map(tab => (
                    <button key={tab.key} className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
                      {tab.label}
                    </button>button>
                  ))}
              </div>div>
        
              <div className="admin-content">
              
                {/* ===== 대시보드 ===== */}
                {activeTab === 'dashboard' && (
                    <div className="admin-section">
                                <h2 className="section-title">📊 대시보드</h2>h2>
                                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:'16px', marginBottom:'24px' }}>
                                  {[
                      { label:'전체 회원', value:dashStats.totalUsers, color:'#d4af37', icon:'👥' },
                      { label:'차단 회원', value:dashStats.bannedUsers, color:'#ff4444', icon:'🚫' },
                      { label:'전체 게시글', value:dashStats.totalPosts, color:'#4caf50', icon:'📝' },
                      { label:'오늘 게시글', value:dashStats.todayPosts, color:'#2196f3', icon:'📅' },
                      { label:'처리 대기 신고', value:dashStats.pendingReports, color:'#ff9800', icon:'⚠️' },
                                    ].map(s => (
                                                      <div key={s.label} style={{ background:'#1a1a1a', border:`1px solid ${s.color}44`, borderRadius:'12px', padding:'16px', textAlign:'center' }}>
                                                                        <div style={{ fontSize:'28px', marginBottom:'8px' }}>{s.icon}</div>div>
                                                                        <div style={{ color:s.color, fontSize:'28px', fontWeight:'bold' }}>{s.value.toLocaleString()}</div>div>
                                                                        <div style={{ color:'#888', fontSize:'12px', marginTop:'4px' }}>{s.label}</div>div>
                                                      </div>div>
                                                    ))}
                                </div>div>
                                <button onClick={fetchDashStats} style={BTN()}>🔄 새로고침</button>button>
                    </div>div>
                      )}
              
                {/* ===== 회원관리 ===== */}
                {activeTab === 'members' && (
                    <div className="admin-section">
                                <h2 className="section-title">👥 회원관리</h2>h2>
                                <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
                                              <input placeholder="닉네임 / 텔레그램ID / telegram_id 검색" value={search}
                                                                onChange={e => setSearch(e.target.value)} style={{ ...INPUT, flex:1 }} />
                                              <button onClick={fetchUsers} style={BTN()}>검색</button>button>
                                </div>div>
                                <div style={{ marginBottom:'12px', display:'flex', gap:'8px', alignItems:'center' }}>
                                              <span style={{ color:'#888', fontSize:'12px' }}>차단 사유:</span>span>
                                              <input placeholder="사유 입력 (기본: 운영 규정 위반)" value={banReason}
                                                                onChange={e => setBanReason(e.target.value)} style={{ ...INPUT, flex:1, maxWidth:'300px' }} />
                                </div>div>
                    
                      {loadingUsers ? (
                                    <div style={{ color:'#888', textAlign:'center', padding:'40px' }}>로딩 중...</div>div>
                                  ) : (
                                    <div>
                                                    <div style={{ color:'#888', fontSize:'12px', marginBottom:'12px' }}>총 {filtered.length}명</div>div>
                                      {filtered.map(u => (
                                                        <div key={u.id} style={{ ...ST, marginBottom:'12px' }}>
                                                                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'12px' }}>
                                                                                                  <div>
                                                                                                                          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                                                                                                                                                    <span style={{ color:'#fff', fontWeight:'bold', fontSize:'15px' }}>{u.nickname}</span>span>
                                                                                                                                                    <span style={{ background: u.status==='banned'?'#2a1010':'#1a2a1a', color:u.status==='banned'?'#ff4444':'#4caf50', padding:'2px 8px', borderRadius:'4px', fontSize:'11px' }}>
                                                                                                                                                      {u.status==='banned' ? '🚫 차단' : '✅ 정상'}
                                                                                                                                                      </span>span>
                                                                                                                                                    <span style={{ background:'#222', color:'#d4af37', padding:'2px 8px', borderRadius:'4px', fontSize:'11px' }}>{u.role || 'user'}</span>span>
                                                                                                                            </div>div>
                                                                                                                          <div style={{ color:'#888', fontSize:'12px' }}>
                                                                                                                                                    @{u.telegram_username || '-'} | ID: {u.telegram_id} | Lv.{u.level_num||1} | {(u.points||0).toLocaleString()}P
                                                                                                                            </div>div>
                                                                                                                          <div style={{ color:'#555', fontSize:'11px', marginTop:'2px' }}>
                                                                                                                                                    가입: {u.created_at ? new Date(u.created_at).toLocaleDateString('ko-KR') : '-'}
                                                                                                                            {u.last_login && ` | 최근접속: ${new Date(u.last_login).toLocaleDateString('ko-KR')}`}
                                                                                                                            {u.banned_at && ` | 차단일: ${new Date(u.banned_at).toLocaleDateString('ko-KR')}`}
                                                                                                                            </div>div>
                                                                                                    </div>div>
                                                                                                  <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                                                                                                                          <select value={u.role||'user'} onChange={e => handleRoleChange(u, e.target.value)}
                                                                                                                                                      style={{ background:'#222', color:'#d4af37', border:'1px solid #444', borderRadius:'6px', padding:'4px 8px', fontSize:'12px' }}>
                                                                                                                                                    <option value="user">일반유저</option>option>
                                                                                                                                                    <option value="moderator">커뮤니티관리자</option>option>
                                                                                                                                                    <option value="admin">관리자</option>option>
                                                                                                                            </select>select>
                                                                                                    {u.status === 'banned'
                                                                                                                                ? <button onClick={() => handleUnban(u)} style={BTN('#4caf50')}>차단해제</button>button>
                                                                                                                            : <button onClick={() => handleBan(u)} style={BTN('#ff4444')}>차단</button>button>
                                                                                                    }
                                                                                                    </div>div>
                                                                            </div>div>
                                                        
                                                                            <div style={{ marginTop:'12px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                                                                                                  <div style={{ display:'flex', gap:'6px' }}>
                                                                                                                          <input type="number" placeholder="포인트 (음수가능)" value={pointInputs[u.id]||''}
                                                                                                                                                      onChange={e => setPointInputs(p=>({...p,[u.id]:e.target.value}))}
                                                                                                                                                      style={{ ...INPUT, flex:1 }} />
                                                                                                                          <input placeholder="사유" value={pointReasons[u.id]||''}
                                                                                                                                                      onChange={e => setPointReasons(p=>({...p,[u.id]:e.target.value}))}
                                                                                                                                                      style={{ ...INPUT, flex:1 }} />
                                                                                                                          <button onClick={() => handleGivePoint(u)} style={BTN()}>지급</button>button>
                                                                                                    </div>div>
                                                                                                  <div style={{ display:'flex', gap:'6px' }}>
                                                                                                                          <input placeholder="관리자 메모" value={memoInputs[u.id] ?? (u.admin_memo||'')}
                                                                                                                                                      onChange={e => setMemoInputs(p=>({...p,[u.id]:e.target.value}))}
                                                                                                                                                      style={{ ...INPUT, flex:1 }} />
                                                                                                                          <button onClick={() => handleSaveMemo(u)} style={BTN('#2196f3')}>저장</button>button>
                                                                                                    </div>div>
                                                                            </div>div>
                                                        </div>div>
                                                      ))}
                                      {filtered.length === 0 && <div style={{ color:'#555', textAlign:'center', padding:'40px' }}>회원이 없습니다.</div>div>}
                                    </div>div>
                                )}
                    </div>div>
                      )}</div>

          {/* ===== 포인트 관리 ===== */}
          {activeTab === 'points' && (
                    <div className="admin-section">
                                <h2 className="section-title">💰 포인트 관리</h2>h2>
                                <p style={{ color:'#888', fontSize:'13px', marginBottom:'20px' }}>회원관리 탭에서 개별 포인트 지급/차감이 가능합니다. 여기서는 포인트 정책을 설정합니다.</p>p>
                                <div style={{ ...ST }}>
                                              <h3 style={{ color:'#d4af37', fontSize:'15px', marginBottom:'16px' }}>포인트 정책 (site_settings)</h3>h3>
                                              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                                                {[
                      { key:'signup_point', label:'가입 포인트' },
                      { key:'attendance_point', label:'출석체크 포인트' },
                      { key:'post_point', label:'게시글 작성 포인트' },
                      { key:'comment_point', label:'댓글 작성 포인트' },
                      { key:'review_point', label:'후기 작성 포인트' },
                                      ].map(item => (
                                                          <div key={item.key}>
                                                                              <label style={{ color:'#888', fontSize:'12px', display:'block', marginBottom:'4px' }}>{item.label}</label>label>
                                                                              <input type="number" value={settings[item.key] || ''} onChange={e => setSettings(p => ({...p, [item.key]: e.target.value}))}
                                                                                                      style={INPUT} />
                                                          </div>div>
                                                        ))}
                                              </div>div>
                                              <button onClick={saveSettings} disabled={savingSettings} style={{ ...BTN(), marginTop:'16px', padding:'10px 24px' }}>
                                                {savingSettings ? '저장 중...' : '💾 포인트 정책 저장'}
                                              </button>button>
                                </div>div>
                    </div>div>
                )}
        
          {/* ===== 광고 관리 ===== */}
          {activeTab === 'ads' && (
                    <div className="admin-section">
                                <h2 className="section-title">📢 광고 관리</h2>h2>
                                <form onSubmit={addAd} style={{ ...ST, marginBottom:'24px' }}>
                                              <h3 style={{ color:'#d4af37', fontSize:'15px', marginBottom:'16px' }}>새 광고 등록</h3>h3>
                                              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                                                              <div><label style={{ color:'#888', fontSize:'12px', display:'block', marginBottom:'4px' }}>제목</label>label>
                                                                                <input value={adForm.title} onChange={e => setAdForm(p=>({...p,title:e.target.value}))} placeholder="광고 제목" style={INPUT} /></div>div>
                                                              <div><label style={{ color:'#888', fontSize:'12px', display:'block', marginBottom:'4px' }}>위치</label>label>
                                                                                <select value={adForm.position} onChange={e => setAdForm(p=>({...p,position:e.target.value}))} style={INPUT}>
                                                                                                    <option value="popup">팝업</option>option>
                                                                                                    <option value="main_slider">메인 슬라이더</option>option>
                                                                                                    <option value="left_sidebar">좌측 사이드바</option>option>
                                                                                                    <option value="right_sidebar">우측 사이드바</option>option>
                                                                                                    <option value="footer_fixed">하단 고정</option>option>
                                                                                                    <option value="board_top">게시판 상단</option>option>
                                                                                                    <option value="board_middle">게시판 중간</option>option>
                                                                                                    <option value="board_bottom">게시판 하단</option>option>
                                                                                </select>select></div>div>
                                                              <div><label style={{ color:'#888', fontSize:'12px', display:'block', marginBottom:'4px' }}>PC 이미지 URL</label>label>
                                                                                <input value={adForm.image_url} onChange={e => setAdForm(p=>({...p,image_url:e.target.value}))} placeholder="https://..." style={INPUT} /></div>div>
                                                              <div><label style={{ color:'#888', fontSize:'12px', display:'block', marginBottom:'4px' }}>모바일 이미지 URL</label>label>
                                                                                <input value={adForm.mobile_image_url} onChange={e => setAdForm(p=>({...p,mobile_image_url:e.target.value}))} placeholder="https://..." style={INPUT} /></div>div>
                                                              <div><label style={{ color:'#888', fontSize:'12px', display:'block', marginBottom:'4px' }}>링크 URL</label>label>
                                                                                <input value={adForm.link_url} onChange={e => setAdForm(p=>({...p,link_url:e.target.value}))} placeholder="https://..." style={INPUT} /></div>div>
                                                              <div><label style={{ color:'#888', fontSize:'12px', display:'block', marginBottom:'4px' }}>노출 순서</label>label>
                                                                                <input type="number" value={adForm.sort_order} onChange={e => setAdForm(p=>({...p,sort_order:parseInt(e.target.value)||0}))} style={INPUT} /></div>div>
                                                              <div><label style={{ color:'#888', fontSize:'12px', display:'block', marginBottom:'4px' }}>안보기 시간 (시간, 팝업용)</label>label>
                                                                                <input type="number" value={adForm.close_hours} onChange={e => setAdForm(p=>({...p,close_hours:parseInt(e.target.value)||24}))} style={INPUT} /></div>div>
                                              </div>div>
                                              <button type="submit" style={{ ...BTN(), marginTop:'16px', padding:'10px 24px' }}>✅ 광고 등록</button>button>
                                </form>form>
                    
                                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                                  {ads.map(a => (
                                      <div key={a.id} style={{ ...ST, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                                        <div>
                                                                            <div style={{ color:'#fff', fontWeight:'bold', marginBottom:'4px' }}>{a.title}</div>div>
                                                                            <div style={{ color:'#888', fontSize:'12px' }}>위치: {a.position} | 순서: {a.sort_order} | 안보기: {a.close_hours}시간</div>div>
                                                          {a.image_url && <div style={{ color:'#555', fontSize:'11px', marginTop:'2px' }}>이미지: {a.image_url.substring(0,50)}...</div>div>}
                                                                            <span style={{ background:a.active?'#1a3a1a':'#2a1a1a', color:a.active?'#4caf50':'#ff4444', padding:'2px 8px', borderRadius:'4px', fontSize:'11px', marginTop:'4px', display:'inline-block' }}>
                                                                              {a.active ? '활성' : '비활성'}
                                                                            </span>span>
                                                        </div>div>
                                                        <div style={{ display:'flex', gap:'6px' }}>
                                                                            <button onClick={() => toggleAd(a.id, a.active)} style={BTN('#888')}>{a.active?'비활성화':'활성화'}</button>button>
                                                                            <button onClick={() => deleteAd(a.id)} style={BTN('#ff4444')}>삭제</button>button>
                                                        </div>div>
                                      </div>div>
                                    ))}
                                  {ads.length === 0 && <div style={{ color:'#555', textAlign:'center', padding:'32px' }}>등록된 광고가 없습니다.</div>div>}
                                </div>div>
                    </div>div>
                )}
        
          {/* ===== 사이트 설정 ===== */}
          {activeTab === 'settings' && (
                    <div className="admin-section">
                                <h2 className="section-title">⚙️ 사이트 설정</h2>h2>
                                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
                                
                                              <div style={ST}>
                                                              <h3 style={{ color:'#d4af37', fontSize:'14px', marginBottom:'12px' }}>🌐 기본 설정</h3>h3>
                                                {[
                      { key:'site_name', label:'사이트명' },
                      { key:'telegram_link', label:'텔레그램 링크' },
                                      ].map(item => (
                                                          <div key={item.key} style={{ marginBottom:'10px' }}>
                                                                              <label style={{ color:'#888', fontSize:'12px', display:'block', marginBottom:'4px' }}>{item.label}</label>label>
                                                                              <input value={settings[item.key]||''} onChange={e => setSettings(p=>({...p,[item.key]:e.target.value}))} style={INPUT} />
                                                          </div>div>
                                                        ))}
                                              </div>div>
                                
                                              <div style={ST}>
                                                              <h3 style={{ color:'#d4af37', fontSize:'14px', marginBottom:'12px' }}>💬 채팅창 설정</h3>h3>
                                                {[
                      { key:'chat_enabled', label:'채팅 활성화 (true/false)' },
                      { key:'chat_right', label:'오른쪽 여백 (px)' },
                      { key:'chat_bottom', label:'아래 여백 (px)' },
                      { key:'chat_width', label:'너비 (px)' },
                      { key:'chat_height', label:'높이 (px)' },
                                      ].map(item => (
                                                          <div key={item.key} style={{ marginBottom:'10px' }}>
                                                                              <label style={{ color:'#888', fontSize:'12px', display:'block', marginBottom:'4px' }}>{item.label}</label>label>
                                                                              <input value={settings[item.key]||''} onChange={e => setSettings(p=>({...p,[item.key]:e.target.value}))} style={INPUT} />
                                                          </div>div>
                                                        ))}
                                              </div>div>
                                
                                              <div style={ST}>
                                                              <h3 style={{ color:'#d4af37', fontSize:'14px', marginBottom:'12px' }}>🏠 메인화면 설정</h3>h3>
                                                {[
                      { key:'stats_visible', label:'통계바 표시 (true/false)' },
                      { key:'notice_visible', label:'공지 섹션 표시 (true/false)' },
                      { key:'banner_visible', label:'배너 섹션 표시 (true/false)' },
                      { key:'hero_layout', label:'히어로 레이아웃 (default/centered/minimal)' },
                      { key:'main_sections_order', label:'섹션 순서 (쉼표 구분)' },
                                      ].map(item => (
                                                          <div key={item.key} style={{ marginBottom:'10px' }}>
                                                                              <label style={{ color:'#888', fontSize:'12px', display:'block', marginBottom:'4px' }}>{item.label}</label>label>
                                                                              <input value={settings[item.key]||''} onChange={e => setSettings(p=>({...p,[item.key]:e.target.value}))} style={INPUT} />
                                                          </div>div>
                                                        ))}
                                              </div>div>
                                
                                              <div style={ST}>
                                                              <h3 style={{ color:'#d4af37', fontSize:'14px', marginBottom:'12px' }}>🪟 팝업/배너 설정</h3>h3>
                                                {[
                      { key:'popup_enabled', label:'팝업 활성화 (true/false)' },
                      { key:'popup_slide_speed', label:'팝업 슬라이드 속도 (ms)' },
                      { key:'popup_default_close_hours', label:'팝업 기본 안보기 시간 (h)' },
                      { key:'main_slider_speed', label:'메인 슬라이더 속도 (ms)' },
                      { key:'sidebar_enabled', label:'사이드바 광고 활성화 (true/false)' },
                      { key:'footer_ad_enabled', label:'하단 광고 활성화 (true/false)' },
                                      ].map(item => (
                                                          <div key={item.key} style={{ marginBottom:'10px' }}>
                                                                              <label style={{ color:'#888', fontSize:'12px', display:'block', marginBottom:'4px' }}>{item.label}</label>label>
                                                                              <input value={settings[item.key]||''} onChange={e => setSettings(p=>({...p,[item.key]:e.target.value}))} style={INPUT} />
                                                          </div>div>
                                                        ))}
                                              </div>div>
                                </div>div>
                    
                                <button onClick={saveSettings} disabled={savingSettings} style={{ ...BTN(), marginTop:'24px', padding:'12px 32px', fontSize:'15px' }}>
                                  {savingSettings ? '저장 중...' : '💾 전체 설정 저장'}
                                </button>button>
                    </div>div>
                )}
        
          {/* ===== 관리 로그 ===== */}
          {activeTab === 'logs' && (
                    <div className="admin-section">
                                <h2 className="section-title">📋 관리 로그</h2>h2>
                                <button onClick={fetchLogs} style={{ ...BTN(), marginBottom:'16px' }}>🔄 새로고침</button>button>
                                <div style={{ overflowX:'auto' }}>
                                              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                                                              <thead>
                                                                                <tr style={{ borderBottom:'1px solid #333' }}>
                                                                                  {['일시','작업','대상','사유','관리자'].map(h => (
                                            <th key={h} style={{ padding:'10px 12px', color:'#d4af37', textAlign:'left', fontWeight:'600' }}>{h}</th>th>
                                          ))}
                                                                                </tr>tr>
                                                              </thead>thead>
                                                              <tbody>
                                                                {logs.map(log => (
                                          <tr key={log.id} style={{ borderBottom:'1px solid #1a1a1a' }}>
                                                                <td style={{ padding:'8px 12px', color:'#666', fontSize:'11px' }}>{new Date(log.created_at).toLocaleString('ko-KR')}</td>td>
                                                                <td style={{ padding:'8px 12px', color:'#d4af37', fontWeight:'bold' }}>{log.action}</td>td>
                                                                <td style={{ padding:'8px 12px', color:'#fff' }}>{log.target_user}</td>td>
                                                                <td style={{ padding:'8px 12px', color:'#888' }}>{log.reason}</td>td>
                                                                <td style={{ padding:'8px 12px', color:'#4caf50' }}>{log.admin_name}</td>td>
                                          </tr>tr>
                                        ))}
                                                              </tbody>tbody>
                                              </table>table>
                                  {logs.length === 0 && <div style={{ color:'#555', textAlign:'center', padding:'40px' }}>로그가 없습니다.</div>div>}
                                </div>div>
                    </div>div>
                )}
        
        </div>div>
    </div>
      )
      }</div>
