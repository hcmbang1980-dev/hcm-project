import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getSettings } from '../services/settingsService'
import { awardActivityPoint } from '../services/pointService'
import { submitReport, hasReported } from '../services/reportService'
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
      const [reportModal, setReportModal] = useState(null) // { type, targetId }
  const [reportReason, setReportReason] = useState('')
      const [reporting, setReporting] = useState(false)

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
                                await supabase.from('posts').update({ views: (data.views || 0) + 1 }).eq('id', id)
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
                    post_id: id, user_id: user.id, content: newComment.trim(), deleted: false,
          })
          if (!error) {
                    await awardActivityPoint(user, 'comment', settings)
                    await supabase.from('user_activity_logs').insert({ user_id: user.id, action: '댓글작성', target_id: String(id) })
                    if (refreshUser) await refreshUser()
                    setNewComment('')
                    fetchComments()
          }
          setSubmittingComment(false)
  }

  const deletePost = async () => {
          if (!user || user.id !== post?.user_id) return
          if (!confirm('게시글을 삭제하시겠습니까?')) return
          await supabase.from('posts').update({ deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.id }).eq('id', id)
          navigate(-1)
  }

  const deleteComment = async (commentId, commentUserId) => {
          if (!user || (user.id !== commentUserId && user.role !== 'admin')) return
          if (!confirm('댓글을 삭제하시겠습니까?')) return
          await supabase.from('comments').update({ deleted: true, deleted_at: new Date().toISOString() }).eq('id', commentId)
          fetchComments()
  }

  const openReportModal = (type, targetId) => {
          if (!user) return alert('로그인이 필요합니다.')
          setReportModal({ type, targetId })
          setReportReason('')
  }

  const handleReport = async () => {
          if (!reportReason.trim()) return alert('신고 사유를 입력해주세요.')
          setReporting(true)
          const alreadyReported = await hasReported(user.id, reportModal.type, reportModal.targetId)
          if (alreadyReported) {
                    alert('이미 신고한 항목입니다.')
                    setReportModal(null)
                    setReporting(false)
                    return
          }
          const { success } = await submitReport({
                    reporterId: user.id,
                    targetType: reportModal.type,
                    targetId: reportModal.targetId,
                    reason: reportReason,
          })
          if (success) {
                    alert('신고가 접수되었습니다. 운영팀에서 검토 후 처리합니다.')
                    setReportModal(null)
          } else {
                    alert('신고 접수 실패. 다시 시도해주세요.')
          }
          setReporting(false)
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
                                        <div style={{ marginTop:'16px', display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                                            {user && user.id === post.user_id && (
                                  <button onClick={deletePost}
                                                      style={{ background:'#2a1010', color:'#ff4444', border:'1px solid #ff444433', borderRadius:'6px', padding:'6px 16px', cursor:'pointer', fontSize:'13px' }}>
                                                  🗑 삭제
                                  </button>button>
                                                    )}
                                            {user && user.id !== post.user_id && (
                                  <button onClick={() => openReportModal('post', id)}
                                                      style={{ background:'#2a1a10', color:'#ff8c00', border:'1px solid #ff8c0033', borderRadius:'6px', padding:'6px 16px', cursor:'pointer', fontSize:'13px' }}>
                                                  🚨 신고
                                  </button>button>
                                                    )}
                                        </div>div>
                              </div>div>
                      
                              <div className="comments-section">
                                        <h3 className="comments-title">💬 댓글 {comments.length}개</h3>h3>
                                  {comments.map(c => (
                                <div key={c.id} className="comment-item card">
                                              <div className="comment-header">
                                                              <span className="comment-author">👤 {c.users?.nickname || '익명'}</span>span>
                                                              <span className="comment-date">{new Date(c.created_at).toLocaleString('ko')}</span>span>
                                                              <div style={{ marginLeft:'auto', display:'flex', gap:'6px' }}>
                                                                  {user && user.id !== c.user_id && (
                                                        <button onClick={() => openReportModal('comment', c.id)}
                                                                                  style={{ background:'none', color:'#ff8c00', border:'none', cursor:'pointer', fontSize:'11px' }}>
                                                                              신고
                                                        </button>button>
                                                                                )}
                                                                  {user && (user.id === c.user_id || user.role === 'admin') && (
                                                        <button onClick={() => deleteComment(c.id, c.user_id)}
                                                                                  style={{ background:'none', color:'#666', border:'none', cursor:'pointer', fontSize:'12px' }}>
                                                                              삭제
                                                        </button>button>
                                                                                )}
                                                              </div>div>
                                              </div>div>
                                              <p className="comment-content">{c.content}</p>p>
                                </div>div>
                              ))}
                                  {user ? (
                                <div className="comment-form">
                                              <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
                                                                  placeholder={`댓글을 입력하세요... (작성 시 +${commentPoint}P 지급)`}
                                                                  rows={3} style={{ width:'100%', resize:'vertical' }} />
                                              <button className="btn-gold" onClick={submitComment} disabled={submittingComment} style={{ marginTop:'8px' }}>
                                                  {submittingComment ? '등록 중...' : '댓글 등록'}
                                              </button>button>
                                </div>div>
                              ) : (
                                <p className="login-required">댓글을 작성하려면 텔레그램 로그인이 필요합니다.</p>p>
                                        )}
                              </div>div>
                      </div>div>
                
                    {/* 신고 모달 */}
                    {reportModal && (
                            <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}
                                          onClick={() => setReportModal(null)}>
                                      <div style={{ background:'#1a1a1a', border:'1px solid #d4af37', borderRadius:'16px', padding:'24px', maxWidth:'400px', width:'100%' }}
                                                      onClick={e => e.stopPropagation()}>
                                                  <h3 style={{ color:'#d4af37', marginBottom:'16px' }}>🚨 신고하기</h3>h3>
                                                  <p style={{ color:'#888', fontSize:'13px', marginBottom:'12px' }}>
                                                      {reportModal.type === 'post' ? '게시글' : '댓글'} 신고 사유를 입력해주세요.
                                                  </p>p>
                                                  <textarea value={reportReason} onChange={e => setReportReason(e.target.value)}
                                                                    placeholder="신고 사유 (예: 광고, 욕설, 음란물 등)"
                                                                    rows={4} style={{ width:'100%', padding:'10px', background:'#222', color:'#fff', border:'1px solid #444', borderRadius:'8px', resize:'none', boxSizing:'border-box', marginBottom:'12px' }} />
                                                  <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                                                                <button onClick={() => setReportModal(null)}
                                                                                    style={{ background:'#333', color:'#888', border:'1px solid #444', borderRadius:'6px', padding:'8px 16px', cursor:'pointer' }}>취소</button>button>
                                                                <button onClick={handleReport} disabled={reporting}
                                                                                    style={{ background:'#ff4444', color:'#fff', border:'none', borderRadius:'6px', padding:'8px 20px', cursor:'pointer', fontWeight:'bold' }}>
                                                                    {reporting ? '접수 중...' : '신고 접수'}
                                                                </button>button>
                                                  </div>div>
                                      </div>div>
                            </div>div>
                      )}
                </div>div>
              )
}</div>
