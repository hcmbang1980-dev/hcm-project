import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const BOARD_NAMES = {
free: '자유게시판', review: '후기게시판', qna: '질문답변',
notice: '공지사항', event: '방앗간 이벤트', intro: '가입인사',
gallery: '👁 안구정화 게시판',
}

export default function WritePage() {
const { type } = useParams()
const { user } = useAuth()
const navigate = useNavigate()
const [title, setTitle] = useState('')
const [content, setContent] = useState('')
const [imageUrl, setImageUrl] = useState('')
const [submitting, setSubmitting] = useState(false)
const isGallery = type === 'gallery'

if (!user) {
return (
<div style={{paddingTop:'84px',textAlign:'center',padding:'80px 20px'}}>
<p style={{color:'#888',marginBottom:'20px'}}>글쓰기는 로그인이 필요합니다.</p>
<button className="btn-gold" onClick={() => navigate(-1)}>돌아가기</button>
</div>
)
}

const handleSubmit = async () => {
if (!title.trim() || !content.trim()) return alert('제목과 내용을 입력해주세요.')
if (isGallery && !imageUrl.trim()) return alert('안구정화 게시판은 이미지 URL이 필요합니다.')
setSubmitting(true)
const { data, error } = await supabase.from('posts').insert({
board_type: type,
category: BOARD_NAMES[type] || type,
title: title.trim(),
content: content.trim(),
author: user.nickname,
user_id: user.id,
image_url: imageUrl.trim() || null,
}).select().single()

if (!error && data) {
await supabase.from('point_history').insert({ user_id: user.id, amount: 5, reason: '게시글 작성' })
navigate('/post/' + data.id)
}
setSubmitting(false)
}

return (
<div style={{paddingTop:'84px',minHeight:'100vh'}}>
<div className="container" style={{maxWidth:'800px',padding:'30px 20px'}}>
<h1 className="page-title" style={{marginBottom:'24px'}}>
<span className="gold-text">{BOARD_NAMES[type]} 글쓰기</span>
</h1>
<div className="card" style={{padding:'24px',display:'flex',flexDirection:'column',gap:'16px'}}>
<input
type="text"
placeholder="제목을 입력하세요"
value={title}
onChange={e => setTitle(e.target.value)}
style={{width:'100%',fontSize:'16px',padding:'12px 16px'}}
/>
{isGallery && (
<div>
<input
type="text"
placeholder="이미지 URL을 입력하세요 (필수)"
value={imageUrl}
onChange={e => setImageUrl(e.target.value)}
style={{width:'100%',fontSize:'14px',padding:'12px 16px',borderRadius:'8px',border:'1px solid rgba(255,215,0,0.3)',background:'#111',color:'#fff'}}
/>
{imageUrl && (
<img src={imageUrl} alt="preview" style={{marginTop:'8px',maxWidth:'100%',maxHeight:'200px',borderRadius:'8px',objectFit:'cover'}} 
  onError={e => {e.target.style.display='none'}} />
)}
</div>
)}
<textarea
placeholder="내용을 입력하세요... (글 작성 시 5포인트 지급)"
value={content}
onChange={e => setContent(e.target.value)}
rows={15}
style={{width:'100%',resize:'vertical',fontSize:'14px',lineHeight:'1.7'}}
/>
<div style={{display:'flex',gap:'12px',justifyContent:'flex-end'}}>
<button onClick={() => navigate(-1)} style={{padding:'10px 20px',background:'none',border:'1px solid #333',borderRadius:'8px',color:'#888',cursor:'pointer'}}>취소</button>
<button className="btn-gold" onClick={handleSubmit} disabled={submitting}>
{submitting ? '등록 중...' : '게시글 등록'}
</button>
</div>
</div>
</div>
</div>
)
}
