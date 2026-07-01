import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { updateSettings, getSettings } from '../services/settingsService'
import './AdminPage.css'

const ROLE_COLORS = { admin: '#ff4444', moderator: '#d4af37', user: '#888888' }
const LEVEL_OPTIONS = ['새싹','씨앗','나무','열매','뿌리','숲','정글','마스터']
const LEVEL_NUM_MAP = {'새싹':1,'씨앗':5,'나무':10,'열매':20,'뿌리':30,'숲':50,'정글':70,'마스터':100}

const PLACE_KEYS = [
{key:'karaoke',label:'한가라 & 로컬 가라오케'},
{key:'club',label:'클럽 & 바'},
{key:'massage',label:'건전마사지 & 이발소'},
{key:'adult',label:'불건전마사지'},
{key:'villa',label:'풀빌라 & 에어비앤비'},
{key:'rent',label:'렌트카 & 운전기사'},
{key:'food',label:'맛집'},
]

const TABS = [
{key:'members',label:'👥 회원 관리'},
{key:'places',label:'🏪 추천업소 관리'},
{key:'stats',label:'📊 통계 수치'},
{key:'popups',label:'🪟 팝업 관리'},
{key:'ads',label:'📢 광고 관리'},
{key:'ui',label:'🎨 UI 설정'},
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
setLockTimer(prev => { if (prev <= 1) { setLocked(false); clearInterval(interval); return 0 } return prev - 1 })
}, 1000)
}
return () => clearInterval(interval)
}, [locked, lockTimer])
const handleSubmit = async (e) => {
e.preventDefault()
if (locked || !pin.trim()) { setError('PIN을 입력하세요'); return }
setLoading(true); setError('')
try {
const { data } = await supabase.from('site_stats').select('admin_pin').eq('id', 1).single()
if (data?.admin_pin === pin.trim()) {
sessionStorage.setItem('admin_pin_verified', (Date.now() + 30 * 60 * 1000).toString())
onSuccess()
} else {
const n = attempts + 1; setAttempts(n)
if (n >= 5) { setLocked(true); setLockTimer(300); setError('5회 틀렸습니다. 5분 후 다시 시도하세요.') }
else setError('PIN이 틀렸습니다. (' + n + '/5회)')
setPin('')
}
} catch { setError('인증 오류가 발생했습니다.') }
setLoading(false)
}
return (
<div style={{minHeight:'100vh',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center'}}>
<div style={{background:'#1a1a1a',border:'2px solid #d4af37',borderRadius:16,padding:'48px 40px',width:'100%',maxWidth:380,boxShadow:'0 20px 60px rgba(0,0,0,0.8)'}}>
<div style={{textAlign:'center',marginBottom:32}}>
<div style={{fontSize:48,marginBottom:12}}>🔐</div>
<h1 style={{color:'#d4af37',fontSize:22,fontWeight:'bold',marginBottom:8}}>관리자 인증</h1>
<p style={{color:'#666',fontSize:14}}>관리자 PIN을 입력하세요</p>
</div>
<form onSubmit={handleSubmit}>
<input type="password" value={pin} onChange={e=>setPin(e.target.value)} placeholder="PIN 입력"
disabled={locked||loading} maxLength={20} autoFocus
style={{width:'100%',padding:'14px 16px',background:'#222',color:'#fff',border:error?'2px solid #ff4444':'2px solid #444',borderRadius:8,fontSize:18,letterSpacing:4,textAlign:'center',marginBottom:16,boxSizing:'border-box',outline:'none'}} />
{error && <div style={{background:'#2a1010',border:'1px solid #ff4444',borderRadius:8,padding:'10px 14px',color:'#ff6666',fontSize:13,marginBottom:16,textAlign:'center'}}>{error}</div>}
{locked && <div style={{color:'#ff9944',textAlign:'center',marginBottom:12,fontSize:14}}>잠금 해제까지: {Math.floor(lockTimer/60)}:{String(lockTimer%60).padStart(2,'0')}</div>}
<button type="submit" disabled={locked||loading}
style={{width:'100%',padding:14,background:locked?'#333':'#d4af37',color:locked?'#666':'#000',border:'none',borderRadius:8,fontSize:16,fontWeight:'bold',cursor:locked?'not-allowed':'pointer'}}>
{loading?'확인 중...':locked?'잠금됨':'확인'}
</button>
</form>
</div>
</div>
)
}
export default function AdminPage() {
const { user } = useAuth()
const navigate = useNavigate()
const [pinVerified, setPinVerified] = useState(false)
const [activeTab, setActiveTab] = useState('members')
const [toast, setToast] = useState(null)
const [users, setUsers] = useState([])
const [searchQuery, setSearchQuery] = useState('')
const [filterRole, setFilterRole] = useState('all')
const [savingUser, setSavingUser] = useState(null)
const [siteStats, setSiteStats] = useState({
members_base:330,online_base:15,today_base:70,total_base:13000,
members_label:'가입인원',online_label:'실시간 접속',today_label:'당일 방문자',total_label:'누적방문자수'
})
const [popups, setPopups] = useState([])
const [newPopup, setNewPopup] = useState({title:'',content:'',link_url:'',is_active:true})
const [ads, setAds] = useState([])
const [newAd, setNewAd] = useState({title:'',image_url:'',link_url:'',position:'top',is_active:true})
const [uiSettings, setUiSettings] = useState({
chat_enabled:'true',chat_position:'inline',chat_right:'20',chat_bottom:'20',chat_width:'380',chat_height:'500',
stats_visible:'true',notice_visible:'true',banner_visible:'true',hero_layout:'default',main_sections_order:'hero,stats,notice,board,banner',
})
const [placeTab, setPlaceTab] = useState('karaoke')
const [placeImages, setPlaceImages] = useState([])
const [newPlace, setNewPlace] = useState({image_url:'',caption:''})

useEffect(() => {
const stored = sessionStorage.getItem('admin_pin_verified')
if (stored && Date.now() < parseInt(stored)) setPinVerified(true)
}, [])
useEffect(() => {
if (!user) { navigate('/'); return }
if (user.role !== 'admin') { navigate('/'); return }
}, [user])
useEffect(() => {
if (pinVerified) { fetchUsers(); fetchSiteStats(); fetchPopups(); fetchAds(); fetchUiSettings() }
}, [pinVerified])
useEffect(() => {
if (pinVerified && activeTab === 'places') fetchPlaceImages(placeTab)
}, [pinVerified, activeTab, placeTab])

const showToast = (msg, type='success') => {
setToast({msg,type})
setTimeout(() => setToast(null), 3000)
}
const fetchUsers = async () => {
const {data,error} = await supabase.from('users').select('id,nickname,telegram_id,role,level,level_num,created_at').order('created_at',{ascending:false})
if (error) { showToast('회원 목록 로드 실패: '+error.message,'error'); return }
setUsers(data||[])
}
const saveUserChanges = async (u) => {
setSavingUser(u.id)
try {
const levelNum = LEVEL_NUM_MAP[u.level]||1
const {error} = await supabase.from('users').update({role:u.role,level:u.level,level_num:levelNum}).eq('id',u.id)
if (error) throw error
showToast(u.nickname+' 저장 완료!')
await fetchUsers()
} catch(e) { showToast('저장 실패: '+(e.message||JSON.stringify(e)),'error') }
setSavingUser(null)
}
const filteredUsers = users.filter(u => {
const matchSearch = !searchQuery||(u.nickname||'').includes(searchQuery)||(u.telegram_id||'').toString().includes(searchQuery)
const matchRole = filterRole==='all'||u.role===filterRole
return matchSearch && matchRole
})
const fetchSiteStats = async () => {
const {data,error} = await supabase.from('site_stats').select('*').eq('id',1).single()
if (error) { showToast('통계 로드 실패: '+error.message,'error'); return }
if (data) {
setSiteStats({
members_base:data.base_members??330,online_base:data.base_online??15,today_base:data.base_today??70,total_base:data.base_total??data.total_visitors??13000,
members_label:data.label_members??'가입인원',online_label:data.label_online??'실시간 접속',today_label:data.label_today??'당일 방문자',total_label:data.label_total??'누적방문자수',
})
}
}
const saveSiteStats = async () => {
const updateData = {
base_members:parseInt(siteStats.members_base)||0,base_online:parseInt(siteStats.online_base)||0,
base_today:parseInt(siteStats.today_base)||0,base_total:parseInt(siteStats.total_base)||0,
total_visitors:parseInt(siteStats.total_base)||0,
label_members:siteStats.members_label,label_online:siteStats.online_label,label_today:siteStats.today_label,label_total:siteStats.total_label,
}
const {error} = await supabase.from('site_stats').update(updateData).eq('id',1)
if (error) { showToast('저장 실패: '+error.message,'error'); return }
showToast('통계 수치 저장 완료!')
await fetchSiteStats()
}
const fetchPopups = async () => {
const {data} = await supabase.from('popups').select('*').order('created_at',{ascending:false})
setPopups(data||[])
}
const addPopup = async () => {
if (!newPopup.title) { showToast('제목을 입력하세요','error'); return }
const {error} = await supabase.from('popups').insert([newPopup])
if (error) { showToast('추가 실패: '+error.message,'error'); return }
setNewPopup({title:'',content:'',link_url:'',is_active:true})
showToast('팝업 추가 완료!'); fetchPopups()
}
const togglePopup = async (id,is_active) => {
await supabase.from('popups').update({is_active:!is_active}).eq('id',id)
fetchPopups()
}
const deletePopup = async (id) => {
if (!window.confirm('팝업을 삭제하시겠습니까?')) return
await supabase.from('popups').delete().eq('id',id)
showToast('팝업 삭제 완료!'); fetchPopups()
}
const fetchAds = async () => {
const {data} = await supabase.from('advertisements').select('*').order('created_at',{ascending:false})
setAds(data||[])
}
const addAd = async () => {
if (!newAd.title) { showToast('제목을 입력하세요','error'); return }
const {error} = await supabase.from('advertisements').insert([newAd])
if (error) { showToast('추가 실패: '+error.message,'error'); return }
setNewAd({title:'',image_url:'',link_url:'',position:'top',is_active:true})
showToast('광고 추가 완료!'); fetchAds()
}
const toggleAd = async (id,is_active) => {
await supabase.from('advertisements').update({is_active:!is_active}).eq('id',id)
fetchAds()
}
const deleteAd = async (id) => {
if (!window.confirm('광고를 삭제하시겠습니까?')) return
await supabase.from('advertisements').delete().eq('id',id)
showToast('광고 삭제 완료!'); fetchAds()
}
const fetchUiSettings = async () => {
try {
const data = await getSettings()
if (data && Object.keys(data).length > 0) setUiSettings(prev=>({...prev,...data}))
} catch(e) { showToast('UI 설정 로드 실패','error') }
}
const saveUiSettings = async () => {
try {
await updateSettings(uiSettings)
showToast('UI 설정 저장 완료!')
} catch(e) { showToast('UI 설정 저장 실패: '+e.message,'error') }
}
const fetchPlaceImages = async (key) => {
const {data} = await supabase.from('place_images').select('*').eq('place_key',key).order('created_at',{ascending:true})
setPlaceImages(data||[])
}
const addPlaceImage = async () => {
if (!newPlace.image_url) { showToast('이미지 URL을 입력하세요','error'); return }
const {error} = await supabase.from('place_images').insert([{place_key:placeTab,image_url:newPlace.image_url,caption:newPlace.caption}])
if (error) { showToast('등록 실패: '+error.message,'error'); return }
setNewPlace({image_url:'',caption:''})
showToast('업소 사진 등록 완료!'); fetchPlaceImages(placeTab)
}
const deletePlaceImage = async (id) => {
if (!window.confirm('사진을 삭제하시겠습니까?')) return
await supabase.from('place_images').delete().eq('id',id)
showToast('삭제 완료!'); fetchPlaceImages(placeTab)
}

if (!pinVerified) return <AdminPinGate onSuccess={()=>setPinVerified(true)} />

const adminCounts = {
all:users.length,
admin:users.filter(u=>u.role==='admin').length,
moderator:users.filter(u=>u.role==='moderator').length,
user:users.filter(u=>u.role==='user').length,
}
const S = {
input:{width:'100%',padding:'8px 12px',background:'#222',border:'1px solid #444',color:'#fff',borderRadius:6,boxSizing:'border-box'},
card:{background:'#1a1a1a',padding:20,borderRadius:10,border:'1px solid #333'}
}
return (
<div className="admin-page">
{toast && (
<div style={{position:'fixed',top:20,right:20,zIndex:9999,background:toast.type==='error'?'#ff4444':'#22c55e',color:'#fff',padding:'12px 20px',borderRadius:8,fontWeight:'bold',boxShadow:'0 4px 12px rgba(0,0,0,0.4)',maxWidth:400}}>
{toast.msg}
</div>
)}
<div className="admin-header">
<h1>🔧 관리자 페이지</h1>
<p>사이트 전체를 관리하세요</p>
</div>
<div className="admin-tabs">
{TABS.map(tab => (
<button key={tab.key} className={'admin-tab-btn '+(activeTab===tab.key?'active':'')} onClick={()=>setActiveTab(tab.key)}>
{tab.label}
</button>
))}
</div>
<div className="admin-content">
{activeTab==='members' && (
<div>
<h2>👥 회원 관리</h2>
<div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
{[['all','전체',adminCounts.all],['admin','관리자',adminCounts.admin],['moderator','커뮤니티관리자',adminCounts.moderator],['user','일반유저',adminCounts.user]].map(([key,label,count]) => (
<button key={key} onClick={()=>setFilterRole(key)}
style={{padding:'8px 16px',background:filterRole===key?'#d4af37':'#222',color:filterRole===key?'#000':'#d4af37',border:'1px solid #d4af37',borderRadius:8,fontWeight:'bold',cursor:'pointer'}}>
{count} {label}
</button>
))}
</div>
<input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="닉네임 또는 텔레그램 아이디 검색..."
style={{...S.input,marginBottom:16}} />
<div style={{overflowX:'auto'}}>
<table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
<thead>
<tr style={{borderBottom:'2px solid #d4af37'}}>
{['닉네임','텔레그램','역할','레벨','가입일','저장'].map(h=>(
<th key={h} style={{padding:10,textAlign:'left',color:'#d4af37'}}>{h}</th>
))}
</tr>
</thead>
<tbody>
{filteredUsers.map(u=>(
<MemberRow key={u.id} u={u} onSave={saveUserChanges} saving={savingUser===u.id} />
))}
</tbody>
</table>
</div>
{filteredUsers.length===0 && <p style={{color:'#666',textAlign:'center',padding:40}}>회원이 없습니다.</p>}
</div>
)}
{activeTab==='places' && (
<div>
<h2>🏪 추천업소 관리</h2>
<p style={{color:'#888',marginBottom:16}}>업소 카테고리별 사진을 등록/삭제합니다.</p>
<div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:20}}>
{PLACE_KEYS.map(p=>(
<button key={p.key} onClick={()=>setPlaceTab(p.key)}
style={{padding:'8px 14px',background:placeTab===p.key?'#d4af37':'#222',color:placeTab===p.key?'#000':'#aaa',border:'1px solid #444',borderRadius:8,cursor:'pointer',fontWeight:placeTab===p.key?'bold':'normal',fontSize:13}}>
{p.label}
</button>
))}
</div>
<div style={{...S.card,marginBottom:20}}>
<h3 style={{color:'#d4af37',marginBottom:12}}>새 사진 등록 ({PLACE_KEYS.find(p=>p.key===placeTab)?.label})</h3>
<input value={newPlace.image_url} onChange={e=>setNewPlace(p=>({...p,image_url:e.target.value}))} placeholder="이미지 URL (필수)"
style={{...S.input,marginBottom:10}} />
<input value={newPlace.caption} onChange={e=>setNewPlace(p=>({...p,caption:e.target.value}))} placeholder="설명 (선택)"
style={{...S.input,marginBottom:10}} />
<button onClick={addPlaceImage} style={{background:'#d4af37',color:'#000',border:'none',padding:'10px 20px',borderRadius:8,fontWeight:'bold',cursor:'pointer'}}>
+ 사진 등록
</button>
</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:16}}>
{placeImages.map(img=>(
<div key={img.id} style={{...S.card,padding:12,position:'relative'}}>
<img src={img.image_url} alt={img.caption||''} style={{width:'100%',height:140,objectFit:'cover',borderRadius:6,marginBottom:8}} />
{img.caption && <p style={{color:'#ccc',fontSize:13,marginBottom:8}}>{img.caption}</p>}
<button onClick={()=>deletePlaceImage(img.id)}
style={{width:'100%',background:'#ff4444',color:'#fff',border:'none',padding:'6px',borderRadius:6,cursor:'pointer',fontSize:13}}>
🗑 삭제
</button>
</div>
))}
{placeImages.length===0 && <p style={{color:'#666',padding:20}}>등록된 사진이 없습니다.</p>}
</div>
</div>
)}
{activeTab==='stats' && (
<div>
<h2>📊 통계 수치 관리</h2>
<p style={{color:'#888',marginBottom:20}}>기본 수치와 표시 텍스트를 설정하세요</p>
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:20}}>
{[['members_label','members_base','가입인원'],['online_label','online_base','실시간 접속'],['today_label','today_base','당일 방문자'],['total_label','total_base','누적방문자수']].map(([lk,bk,ph])=>(
<div key={lk} style={{...S.card}}>
<label style={{color:'#888',fontSize:12,display:'block',marginBottom:6}}>표시 텍스트</label>
<input value={siteStats[lk]||''} onChange={e=>setSiteStats(p=>({...p,[lk]:e.target.value}))} placeholder={ph} style={{...S.input,marginBottom:8}} />
<label style={{color:'#888',fontSize:12,display:'block',marginBottom:6}}>기본 수치</label>
<input type="number" value={siteStats[bk]||0} onChange={e=>setSiteStats(p=>({...p,[bk]:e.target.value}))} style={{...S.input,color:'#d4af37'}} />
</div>
))}
</div>
<button onClick={saveSiteStats} style={{background:'#d4af37',color:'#000',border:'none',padding:'12px 24px',borderRadius:8,fontWeight:'bold',cursor:'pointer',fontSize:15}}>💾 저장</button>
</div>
)}
{activeTab==='popups' && (
<div>
<h2>🪟 팝업 관리</h2>
<div style={{...S.card,marginBottom:24}}>
<h3 style={{color:'#d4af37',marginBottom:16}}>새 팝업 추가</h3>
<input value={newPopup.title} onChange={e=>setNewPopup(p=>({...p,title:e.target.value}))} placeholder="팝업 제목" style={{...S.input,marginBottom:10}} />
<textarea value={newPopup.content} onChange={e=>setNewPopup(p=>({...p,content:e.target.value}))} placeholder="팝업 내용" rows={4} style={{...S.input,marginBottom:10,resize:'vertical'}} />
<input value={newPopup.link_url} onChange={e=>setNewPopup(p=>({...p,link_url:e.target.value}))} placeholder="링크 URL (선택)" style={{...S.input,marginBottom:10}} />
<button onClick={addPopup} style={{background:'#d4af37',color:'#000',border:'none',padding:'10px 20px',borderRadius:8,fontWeight:'bold',cursor:'pointer'}}>+ 팝업 추가</button>
</div>
{popups.map(p=>(
<div key={p.id} style={{...S.card,marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<div>
<div style={{fontWeight:'bold',color:'#fff',marginBottom:4}}>{p.title}</div>
<div style={{color:'#888',fontSize:13}}>{(p.content||'').substring(0,60)}</div>
</div>
<div style={{display:'flex',gap:8}}>
<button onClick={()=>togglePopup(p.id,p.is_active)} style={{background:p.is_active?'#22c55e':'#555',color:'#fff',border:'none',padding:'6px 14px',borderRadius:6,cursor:'pointer',fontSize:13}}>{p.is_active?'활성':'비활성'}</button>
<button onClick={()=>deletePopup(p.id)} style={{background:'#ff4444',color:'#fff',border:'none',padding:'6px 14px',borderRadius:6,cursor:'pointer',fontSize:13}}>삭제</button>
</div>
</div>
))}
{popups.length===0 && <p style={{color:'#888',textAlign:'center',padding:40}}>등록된 팝업이 없습니다.</p>}
</div>
)}
{activeTab==='ads' && (
<div>
<h2>📢 광고 관리</h2>
<div style={{...S.card,marginBottom:24}}>
<h3 style={{color:'#d4af37',marginBottom:16}}>새 광고 추가</h3>
<input value={newAd.title} onChange={e=>setNewAd(a=>({...a,title:e.target.value}))} placeholder="광고 제목" style={{...S.input,marginBottom:10}} />
<input value={newAd.image_url} onChange={e=>setNewAd(a=>({...a,image_url:e.target.value}))} placeholder="이미지 URL" style={{...S.input,marginBottom:10}} />
<input value={newAd.link_url} onChange={e=>setNewAd(a=>({...a,link_url:e.target.value}))} placeholder="링크 URL" style={{...S.input,marginBottom:10}} />
<select value={newAd.position} onChange={e=>setNewAd(a=>({...a,position:e.target.value}))} style={{...S.input,marginBottom:10}}>
<option value="top">상단</option><option value="bottom">하단</option><option value="sidebar">사이드바</option>
</select>
<button onClick={addAd} style={{background:'#d4af37',color:'#000',border:'none',padding:'10px 20px',borderRadius:8,fontWeight:'bold',cursor:'pointer'}}>+ 광고 추가</button>
</div>
{ads.map(a=>(
<div key={a.id} style={{...S.card,marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<div>
<div style={{fontWeight:'bold',color:'#fff',marginBottom:4}}>{a.title}</div>
<div style={{color:'#888',fontSize:13}}>{a.position} | {a.link_url}</div>
</div>
<div style={{display:'flex',gap:8}}>
<button onClick={()=>toggleAd(a.id,a.is_active)} style={{background:a.is_active?'#22c55e':'#555',color:'#fff',border:'none',padding:'6px 14px',borderRadius:6,cursor:'pointer',fontSize:13}}>{a.is_active?'활성':'비활성'}</button>
<button onClick={()=>deleteAd(a.id)} style={{background:'#ff4444',color:'#fff',border:'none',padding:'6px 14px',borderRadius:6,cursor:'pointer',fontSize:13}}>삭제</button>
</div>
</div>
))}
{ads.length===0 && <p style={{color:'#888',textAlign:'center',padding:40}}>등록된 광고가 없습니다.</p>}
</div>
)}
{activeTab==='ui' && (
<div>
<h2>🎨 UI 설정</h2>
<p style={{color:'#888',marginBottom:20}}>메인화면 레이아웃, 체팅사위치 등 사이트 UI를 어드민에서 직접 제어합니다.</p>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
<div style={{...S.card}}>
<h3 style={{color:'#d4af37',marginBottom:16}}>💬 체팅창 설정</h3>
<label style={{color:'#aaa',fontSize:13,display:'block',marginBottom:8}}>체팅창 표시</label>
<div style={{display:'flex',gap:8,marginBottom:16}}>
{[['true','표시'],['false','숨김']].map(([val,label])=>(
<button key={val} onClick={()=>setUiSettings(s=>({...s,chat_enabled:val}))}
style={{flex:1,padding:10,background:uiSettings.chat_enabled===val?(val==='true'?'#d4af37':'#666'):'#333',color:uiSettings.chat_enabled===val?(val==='true'?'#000':'#fff'):'#aaa',border:'none',borderRadius:6,cursor:'pointer',fontWeight:'bold'}}>
{label}
</button>
))}
</div>
<label style={{color:'#aaa',fontSize:13,display:'block',marginBottom:8}}>체팅창 위치</label>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
{[['inline','📌 메인화면 인라인'],['bottom-right','↘ 우측 하단 팝업'],['bottom-left','↙ 좌측 하단 팝업'],['top-right','↗ 우측 상단 팝업']].map(([val,label])=>(
<button key={val} onClick={()=>setUiSettings(s=>({...s,chat_position:val}))}
style={{padding:8,background:uiSettings.chat_position===val?'#d4af37':'#333',color:uiSettings.chat_position===val?'#000':'#aaa',border:'none',borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:uiSettings.chat_position===val?'bold':'normal'}}>
{label}
</button>
))}
</div>
</div>
<div style={{...S.card}}>
<h3 style={{color:'#d4af37',marginBottom:16}}>🏠 메인화면 섹션</h3>
{[['stats_visible','통계 섹션'],['notice_visible','공지사항'],['banner_visible','배너']].map(([key,label])=>(
<div key={key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
<span style={{color:'#fff'}}>{label}</span>
<div style={{display:'flex',gap:6}}>
{[['true','표시'],['false','숨김']].map(([val,text])=>(
<button key={val} onClick={()=>setUiSettings(s=>({...s,[key]:val}))}
style={{padding:'6px 14px',background:uiSettings[key]===val?(val==='true'?'#d4af37':'#555'):'#333',color:uiSettings[key]===val?(val==='true'?'#000':'#fff'):'#aaa',border:'none',borderRadius:6,cursor:'pointer',fontSize:13}}>
{text}
</button>
))}
</div>
</div>
))}
</div>
</div>
<div style={{...S.card,marginBottom:20}}>
<h3 style={{color:'#d4af37',marginBottom:12}}>📋 메인 섹션 순서 (쉼표로 구분)</h3>
<input value={uiSettings.main_sections_order||''} onChange={e=>setUiSettings(s=>({...s,main_sections_order:e.target.value}))} placeholder="hero,stats,notice,board,banner" style={{...S.input,marginBottom:8}} />
<p style={{color:'#666',fontSize:12}}>예: hero,stats,notice,board,banner (사용 가능: hero, stats, notice, board, banner)</p>
</div>
<button onClick={saveUiSettings} style={{background:'#d4af37',color:'#000',border:'none',padding:'12px 24px',borderRadius:8,fontWeight:'bold',cursor:'pointer',fontSize:15}}>💾 UI 설정 저장</button>
</div>
)}
</div>
</div>
)
}

function MemberRow({ u, onSave, saving }) {
const [role, setRole] = useState(u.role||'user')
const [level, setLevel] = useState(u.level||'새싹')
return (
<tr style={{borderBottom:'1px solid #333'}}>
<td style={{padding:10,color:'#fff',minWidth:100,whiteSpace:'nowrap'}}>{u.nickname||'-'}</td>
<td style={{padding:10,color:'#888'}}>@{u.telegram_id||'-'}</td>
<td style={{padding:10}}>
<select value={role} onChange={e=>setRole(e.target.value)} style={{background:'#222',color:ROLE_COLORS[role]||'#fff',border:'1px solid #444',padding:'4px 8px',borderRadius:4,fontWeight:'bold'}}>
<option value="user">일반 유저</option>
<option value="moderator">커뮤니티 관리자</option>
<option value="admin">관리자</option>
</select>
</td>
<td style={{padding:10}}>
<select value={level} onChange={e=>setLevel(e.target.value)} style={{background:'#222',color:'#d4af37',border:'1px solid #444',padding:'4px 8px',borderRadius:4}}>
{LEVEL_OPTIONS.map(lv=><option key={lv} value={lv}>{lv}</option>)}
</select>
</td>
<td style={{padding:10,color:'#666',fontSize:13}}>
{u.created_at?new Date(u.created_at).toLocaleDateString('ko-KR'):'-'}
</td>
<td style={{padding:10}}>
<button onClick={()=>onSave({...u,role,level})} disabled={saving}
style={{background:saving?'#555':'#d4af37',color:saving?'#aaa':'#000',border:'none',padding:'6px 14px',borderRadius:6,fontWeight:'bold',cursor:saving?'not-allowed':'pointer',fontSize:13}}>
{saving?'저장중...':'💾 저장'}
</button>
</td>
</tr>
)
}

// v2
