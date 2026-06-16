import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './PostPage.css'

export default function PostPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPost()
    fetchComments()
    // 조회수 증가
    supabase.from('posts').update({ views: (post?.views || 0) + 1 }).eq('id', id)
  }, [id])

  const fetchPost = async () => {
    const { data } = await supabase.from('posts').select('*, users(nickname, level)').eq('id', id).single()
    setPost(data)
    setLoading(false)
  }

  const fetchComments = async () => {
    const { data } = await supabase.from('comments').select('*, users(nickname)').eq('post_id', id).order('created_at')
    setComments(data || [])
  }

  const submitComment = async () => {
    if (!user) return alert('로그인이 필요합니다.')
    if (!newComment.trim()) return
    await supabase.from('comments').insert({
      post_id: id,
      user_id: user.id,
      content: newComment.trim()
    })
    // 포인트 지급
    await supabase.from('point_history').insert({ user_id: user.id, amount: 2, reason: '댓글 작성' })
    setNewComment('')
    fetchComments()
  }

  if (loading) return <div className="loading-page">로딩 중...</div>
  if (!post) return <div className="loading-page">게시글을 찾을 수 없습니다.</div>

  return (
    <div className="post-page">
      <div className="container">
        <button className="btn-back" onClick={() => navigate(-1)}>← 목록으로</button>
        <div className="post-detail card">
          <h1 className="post-detail-title">{post.title}</h1>
          <div className="post-detail-meta">
            <span>👤 {post.users?.nickname || '익명'}</span>
            <span>👁 {post.views}</span>
            <span>{new Date(post.created_at).toLocaleString('ko')}</span>
          </div>
          <div className="gold-divider"></div>
          <div className="post-detail-content">{post.content}</div>
        </div>

        <div className="comments-section">
          <h3 className="comments-title">💬 댓글 {comments.length}개</h3>
          {comments.map(c => (
            <div key={c.id} className="comment-item card">
              <div className="comment-header">
                <span className="comment-author">👤 {c.users?.nickname || '익명'}</span>
                <span className="comment-date">{new Date(c.created_at).toLocaleString('ko')}</span>
              </div>
              <p className="comment-content">{c.content}</p>
            </div>
          ))}
          {user ? (
            <div className="comment-form">
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="댓글을 입력하세요... (댓글 작성 시 2포인트 지급)"
                rows={3}
                style={{ width: '100%', resize: 'vertical' }}
              />
              <button className="btn-gold" onClick={submitComment} style={{marginTop:'8px'}}>댓글 등록</button>
            </div>
          ) : (
            <p className="login-required">댓글을 작성하려면 텔레그램 로그인이 필요합니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}