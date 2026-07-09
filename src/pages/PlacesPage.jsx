import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const CATEGORY_MAP = {
  karaoke: '한가라 & 로컬 가라오케',
  club: '클럽 & 바',
  massage: '건전마사지 & 이발소',
  adult: '불건전마사지',
  villa: '풀빌라 & 에어비앤비',
  rent: '렌트카 & 운전기사',
  food: '맛집',
}

const STAR_COLORS = ['#ccc','#f59e0b','#f59e0b','#f59e0b','#f59e0b','#f59e0b']

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{display:'flex',gap:4}}>
      {[1,2,3,4,5].map(s => (
        <span key={s}
          onClick={()=>onChange&&onChange(s)}
          onMouseEnter={()=>onChange&&setHover(s)}
          onMouseLeave={()=>onChange&&setHover(0)}
          style={{fontSize:24,cursor:onChange?'pointer':'default',color:(hover||value)>=s?'#f59e0b':'#444',transition:'color 0.1s'}}>
          ★
        </span>
      ))}
    </div>
  )
}

export default function PlacesPage() {
  const { category, id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [places, setPlaces] = useState([])
  const [place, setPlace] = useState(null)
  const [images, setImages] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [reviewText, setReviewText] = useState('')
  const [rating, setRating] = useState(5)
  const [submitting, setSubmitting] = useState(false)

  const isAdmin = user && (user.role === 'admin' || user.role === 'community_admin')

  useEffect(() => {
    if (id) fetchPlaceDetail()
    else if (category) fetchPlaces()
  }, [id, category])

  const fetchPlaces = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('places')
      .select('id,name,category,address,phone,description,price_range,banner_url,views,likes,status,tags')
      .eq('category', category)
      .eq('status', '노출중')
      .order('created_at', { ascending: false })
    setPlaces(data || [])
    setLoading(false)
  }

  const fetchPlaceDetail = async () => {
    setLoading(true)
    const { data: p } = await supabase.from('places').select('*').eq('id', id).single()
    if (!p) { navigate('/'); return }
    setPlace(p)
    await supabase.from('places').update({ views: (p.views||0)+1 }).eq('id', id)
    const { data: imgs } = await supabase.from('place_images').select('*').eq('place_key', p.category).order('created_at')
    setImages(imgs || [])
    const { data: rvs } = await supabase.from('reviews').select('*').eq('place_id', id).order('created_at', { ascending: false })
    setReviews(rvs || [])
    setLoading(false)
  }

  const submitReview = async () => {
    if (!user) { alert('로그인이 필요합니다.'); return }
    if (!reviewText.trim()) { alert('후기 내용을 입력하세요.'); return }
    setSubmitting(true)
    const { error } = await supabase.from('reviews').insert({
      place_id: parseInt(id),
      author: user.nickname,
      content: reviewText.trim(),
      rating,
    })
    if (error) { alert('등록 실패: '+error.message); setSubmitting(false); return }
    setReviewText(''); setRating(5)
    await fetchPlaceDetail()
    setSubmitting(false)
  }

  const deleteReview = async (rid) => {
    if (!window.confirm('후기를 삭제하시겠습니까?')) return
    await supabase.from('reviews').delete().eq('id', rid)
    await fetchPlaceDetail()
  }

  const S = {
    page: { minHeight:'100vh', background:'#0a0a0a', color:'#fff', padding:'24px 16px' },
    container: { maxWidth:1100, margin:'0 auto' },
    card: { background:'#1a1a1a', border:'1px solid #333', borderRadius:12, padding:20, marginBottom:16, cursor:'pointer', transition:'border-color 0.2s' },
    badge: { display:'inline-block', background:'#d4af37', color:'#000', borderRadius:4, padding:'2px 8px', fontSize:12, fontWeight:'bold', marginBottom:8 },
  }

  if (loading) return <div style={{...S.page,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{color:'#d4af37',fontSize:18}}>로딩 중...</div></div>

  // 업소 상세 페이지
  if (id && place) {
    const avgRating = reviews.length ? (reviews.reduce((a,r)=>a+r.rating,0)/reviews.length).toFixed(1) : '-'
    return (
      <div style={S.page}>
        <div style={S.container}>
          <button onClick={()=>navigate('/places/'+place.category)} style={{background:'none',border:'1px solid #444',color:'#aaa',padding:'6px 14px',borderRadius:6,cursor:'pointer',marginBottom:20}}>
            ← 목록으로
          </button>
          {place.banner_url && <img src={place.banner_url} alt={place.name} style={{width:'100%',maxHeight:280,objectFit:'cover',borderRadius:12,marginBottom:20}} />}
          <div style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:12,padding:24,marginBottom:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
              <div>
                <span style={S.badge}>{CATEGORY_MAP[place.category]||place.category}</span>
                <h1 style={{color:'#d4af37',fontSize:24,fontWeight:'bold',marginBottom:8}}>{place.name}</h1>
                {reviews.length>0 && <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}><StarRating value={Math.round(avgRating)} /><span style={{color:'#f59e0b',fontWeight:'bold'}}>{avgRating}</span><span style={{color:'#666',fontSize:13}}>({reviews.length}건)</span></div>}
              </div>
              <div style={{display:'flex',gap:8}}>
                <span style={{color:'#666',fontSize:13}}>👁 {place.views||0}</span>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginTop:16}}>
              {place.address && <div style={{color:'#ccc',fontSize:14}}><span style={{color:'#d4af37'}}>&#128205;</span> {place.address}</div>}
              {place.phone && <div style={{color:'#ccc',fontSize:14}}><span style={{color:'#d4af37'}}>&#128222;</span> {place.phone}</div>}
              {place.price_range && <div style={{color:'#ccc',fontSize:14}}><span style={{color:'#d4af37'}}>&#128176;</span> {place.price_range}</div>}
            </div>
            {place.description && <p style={{color:'#bbb',marginTop:16,lineHeight:1.7,whiteSpace:'pre-wrap'}}>{place.description}</p>}
            {place.content && <div style={{marginTop:16,padding:16,background:'#111',borderRadius:8,color:'#ccc',lineHeight:1.8,whiteSpace:'pre-wrap'}}>{place.content}</div>}
            {place.tags && place.tags.length>0 && (
              <div style={{marginTop:12,display:'flex',flexWrap:'wrap',gap:6}}>
                {place.tags.map((t,i)=><span key={i} style={{background:'#222',color:'#d4af37',border:'1px solid #d4af37',borderRadius:4,padding:'2px 8px',fontSize:12}}>#{t}</span>)}
              </div>
            )}
          </div>
          {images.length>0 && (
            <div style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:12,padding:20,marginBottom:20}}>
              <h3 style={{color:'#d4af37',marginBottom:12}}>📸 업소 사진</h3>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10}}>
                {images.map(img=>(
                  <div key={img.id}>
                    <img src={img.image_url} alt={img.caption||''} style={{width:'100%',height:130,objectFit:'cover',borderRadius:8}} />
                    {img.caption&&<p style={{color:'#888',fontSize:12,marginTop:4,textAlign:'center'}}>{img.caption}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:12,padding:20,marginBottom:20}}>
            <h3 style={{color:'#d4af37',marginBottom:16}}>💬 후기 {reviews.length>0&&<span style={{color:'#888',fontSize:14,fontWeight:'normal'}}>({reviews.length}건 · 평점 {avgRating})</span>}</h3>
            {user ? (
              <div style={{background:'#111',borderRadius:8,padding:16,marginBottom:20}}>
                <div style={{marginBottom:10}}>
                  <span style={{color:'#aaa',fontSize:13,marginRight:8}}>별점:</span>
                  <StarRating value={rating} onChange={setRating} />
                </div>
                <textarea value={reviewText} onChange={e=>setReviewText(e.target.value)}
                  placeholder="업소 이용 후기를 남겨주세요..." rows={4}
                  style={{width:'100%',background:'#222',border:'1px solid #444',color:'#fff',borderRadius:6,padding:10,resize:'vertical',boxSizing:'border-box',fontSize:14}} />
                <button onClick={submitReview} disabled={submitting}
                  style={{marginTop:8,background:submitting?'#555':'#d4af37',color:submitting?'#aaa':'#000',border:'none',padding:'10px 20px',borderRadius:6,fontWeight:'bold',cursor:submitting?'not-allowed':'pointer'}}>
                  {submitting?'등록 중...':'후기 등록'}
                </button>
              </div>
            ) : <p style={{color:'#888',marginBottom:16}}><Link to="/login" style={{color:'#d4af37'}}>로그인</Link> 후 후기를 남길 수 있습니다.</p>}
            {reviews.length===0 && <p style={{color:'#666',textAlign:'center',padding:20}}>첫 후기를 남겨보세요!</p>}
            {reviews.map(r=>(
              <div key={r.id} style={{borderBottom:'1px solid #2a2a2a',paddingBottom:16,marginBottom:16}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{color:'#d4af37',fontWeight:'bold',fontSize:14}}>{r.author}</span>
                    <StarRating value={r.rating} />
                    <span style={{color:'#f59e0b',fontSize:13}}>{r.rating}.0</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{color:'#555',fontSize:12}}>{new Date(r.created_at).toLocaleDateString('ko-KR')}</span>
                    {(isAdmin||(user&&user.nickname===r.author)) && (
                      <button onClick={()=>deleteReview(r.id)} style={{background:'none',border:'none',color:'#ff4444',cursor:'pointer',fontSize:12}}>삭제</button>
                    )}
                  </div>
                </div>
                <p style={{color:'#ccc',lineHeight:1.7,whiteSpace:'pre-wrap',margin:0}}>{r.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // 업소 목록 페이지
  const categoryIcon = category==='karaoke'?'🎤':category==='club'?'🍺':category==='massage'?'💆':category==='adult'?'💋':category==='villa'?'🏠':category==='rent'?'🚗':'🍜'

  return (
    <div style={S.page}>
      <div style={S.container}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <div>
            <h1 style={{color:'#d4af37',fontSize:22,fontWeight:'bold'}}>{CATEGORY_MAP[category]||category}</h1>
            <p style={{color:'#666',fontSize:13,marginTop:4}}>업소 {places.length}건</p>
          </div>
          <button onClick={()=>navigate('/')} style={{background:'none',border:'1px solid #444',color:'#aaa',padding:'6px 14px',borderRadius:6,cursor:'pointer'}}>
            ← 메인
          </button>
        </div>
        {loading && <div style={{color:'#888',textAlign:'center',padding:40}}>로딩 중...</div>}
        {!loading && places.length===0 && <div style={{color:'#666',textAlign:'center',padding:60}}>등록된 업소가 없습니다.</div>}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:20}}>
          {places.map(p=>(
            <div key={p.id} style={{...S.card,padding:0,overflow:'hidden',marginBottom:0}} onClick={()=>navigate('/place/'+p.id)}>
              <div style={{position:'relative'}}>
                {p.banner_url
                  ? <img src={p.banner_url} alt={p.name} style={{width:'100%',height:180,objectFit:'cover'}} />
                  : <div style={{width:'100%',height:180,background:'#222',display:'flex',alignItems:'center',justifyContent:'center',fontSize:40}}>
                      {categoryIcon}
                    </div>}
                <span style={{position:'absolute',top:10,left:10,background:'#d4af37',color:'#000',fontSize:12,fontWeight:'bold',padding:'4px 10px',borderRadius:6}}>
                  {CATEGORY_MAP[category]||category}
                </span>
              </div>
              <div style={{padding:18}}>
                <h3 style={{color:'#fff',fontWeight:'bold',fontSize:18,marginBottom:6}}>{p.name}</h3>
                {p.description && (
                  <p style={{color:'#999',fontSize:13,marginBottom:12,lineHeight:1.5,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
                    {p.description}
                  </p>
                )}
                {p.tags && p.tags.length>0 && (
                  <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:6,marginBottom:14}}>
                    {p.tags.slice(0,4).map((t,i)=>(
                      <span key={i} style={{background:'#222',border:'1px solid #333',borderRadius:6,padding:'6px 8px',fontSize:12,color:'#ccc',textAlign:'center',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t}</span>
                    ))}
                  </div>
                )}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:'1px solid #2a2a2a',paddingTop:12}}>
                  <div>
                    {p.address && <p style={{color:'#777',fontSize:12,marginBottom:2}}>📍 {p.address}</p>}
                    {p.price_range && (
                      <div>
                        <span style={{color:'#888',fontSize:11}}>예상 가격</span>
                        <div style={{color:'#d4af37',fontWeight:'bold',fontSize:17}}>{p.price_range}</div>
                      </div>
                    )}
                  </div>
                  <button style={{background:'#fff',color:'#000',border:'none',padding:'9px 16px',borderRadius:8,fontWeight:'bold',fontSize:13,cursor:'pointer',whiteSpace:'nowrap'}}>상세보기 →</button>
                </div>
                <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}>
                  <span style={{color:'#555',fontSize:12}}>👁 {p.views||0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
