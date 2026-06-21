import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getSettings } from '../services/settingsService'
import { awardActivityPoint } from '../services/pointService'
import './PostPage.css'

export default function PostPage() {
    const { id } = useParams()
    const { user, refreshUser } = useAuth()
    const navigate = useNavigate()
    const [post, setPost] = useState(null)
    const [comments, setComments] = useState([])
    const [newComment, setNewComment] = useState('')
    const [loading, setLoading] = useState(true)
    const [settings, setSettings] = useState({})
    const [submittingComment, setSubmittingComment] = useState(false)

  useEffect(() => {
        fetchPost()
        fetchComments()
        getSettings().then(s => setSettings(s))
  }, [id])

  const fetchPost = async () => {
        const { data } = await supabase
          .from('posts')
          .select('*, users(nickname, level)')
          .eq('id', id)
          .single()
        if (data) {
                setPost(data)
                if (!user || user.id !== data.user_id) {
                          await supabase.from('posts')
                            .update({ views: (data.views || 0) + 1 })
                            .eq('id', id)
                }
        }
        setLoading(false)
  }

  const fetchComments = async () => {
        const { data } = await supabase
          .from('comments')
          .select('*, users(nickname)')
          .eq('post_id', id)
          .order('created_at')
        setComments((data || []).filter(c => !c.deleted))
  }

  const submitComment = async () => {
        if (!user) return alert('로그인이 필요합니다.')
        if (!newComment.trim()) return
        setSubmittingComment(true)
        const { error } = await supabase.from('comments').insert({
                post_id: id,
                user_id: user.id,
                content: newComment.trim(),
                deleted: false,
        })
        if (!error) {
                await awardActivityPoint(user, 'comment', settings)
                await supabase.from('user_activity_logs').insert({
                          user_id: user.id, action: '댓글작성', target_id: String(id),
                })
                if (refreshUser) await refreshUser()
                setNewComment('')
                fetchComments()
        }
        setSubmittingComment(false)
  }

  const deletePost = async () => {
        if (!user || user.id !== post?.user_id) return
        if (!confirm('게시글을 삭제하시겠습니까?')) return
        await supabase.from('posts').update({
                deleted: true,
                deleted_at: new Date().toISOString(),
                deleted_by: user.id,
        }).eq('id', id)
        navigate(-1)
  }

  const deleteComment = async (commentId, commentUserId) => {
        if (!user || (user.id !== commentUserId && user.role !== 'admin')) return
        if (!confirm('댓글을 삭제하시겠습니까?')) return
        await supabase.from('comments').update({
                deleted: true,
                deleted_at: new Date().toISOString(),
        }).eq('id', commentId)
        fetchComments()
  }

  if (loading) return <div className="loading-page">로딩 중...</div>div>
      if (!post || post.deleted) return <div className="loading-page">게시글을 찾을 수 없습니다.</div>div>
    
      const commentPoint = Number(settings.comment_point || 2)
    
      return (
            <div className="post-page">
                  <div className="container">
                          <button className="btn-back" onClick={() => navigate(-1)}>← 목록으로</button>button>
                          <div className="post-detail card">
                                    <h1 className="post-detail-title">{post.title}</h1>h1>
                                    <div className="post-detail-meta">
                                                <span>👤 {post.users?.nickname || '익명'}</span>span>
                                                <span>👁 {post.views || 0}</span>span>
                                                <span>{new Date(post.created_at).toLocaleString('ko')}</span>span>
                                    </div>div>
                                    <div className="gold-divider"></div>div>
                            {post.image_url && (
                          <img src={post.image_url} alt={post.title}
                                          style={{ maxWidth:'100%', borderRadius:'8px', marginBottom:'16px', objectFit:'cover' }} />
                        )}
                                    <div className="post-detail-content">{post.content}</div>div>
                            {user && user.id === post.user_id && (
                          <div style={{ marginTop:'16px', display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                                        <button onClick={deletePost}
                                                          style={{ background:'#2a1010', color:'#ff4444', border:'1px solid #ff444433', borderRadius:'6px', padding:'6px 16px', cursor:'pointer', fontSize:'13px' }}>
                                                        🗑 게시글 삭제
                                        </button>button>
                          </div>div>
                                    )}
                          </div>div>
                  
                          <div className="comments-section">
                                    <h3 className="comments-title">💬 댓글 {comments.length}개</h3>h3>
                            {comments.map(c => (
                          <div key={c.id} className="comment-item card">
                                        <div className="comment-header">
                                                        <span className="comment-author">👤 {c.users?.nickname || '익명'}</span>span>
                                                        <span className="comment-date">{new Date(c.created_at).toLocaleString('ko')}</span>span>
                                          {user && (user.id === c.user_id || user.role === 'admin') && (
                                              <button onClick={() => deleteComment(c.id, c.user_id)}
                                                                    style={{ marginLeft:'auto', background:'none', color:'#666', border:'none', cursor:'pointer', fontSize:'12px' }}>
                                                                  삭제
                                              </button>button>
                                                        )}
                                        </div>div>
                                        <p className="comment-content">{c.content}</p>p>
                          </div>div>
                        ))}
                            {user ? (
                          <div className="comment-form">
                                        <textarea
                                                          value={newComment}
                                                          onChange={e => setNewComment(e.target.value)}
                                                          placeholder={`댓글을 입력하세요... (작성 시 +${commentPoint}P 지급)`}
                                                          rows={3}
                                                          style={{ width:'100%', resize:'vertical' }}
                                                        />
                                        <button className="btn-gold" onClick={submitComment} disabled={submittingComment} style={{ marginTop:'8px' }}>
                                          {submittingComment ? '등록 중...' : '댓글 등록'}
                                        </button>button>
                          </div>div>
                        ) : (
                          <p className="login-required">댓글을 작성하려면 텔레그램 로그인이 필요합니다.</p>p>
                                    )}
                          </div>div>
                  </div>div>
            </div>div>
          )
}</div>
