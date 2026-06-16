import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import BoardPage from './pages/BoardPage'
import PostPage from './pages/PostPage'
import WritePage from './pages/WritePage'
import MyPage from './pages/MyPage'
import LoginPage from './pages/LoginPage'
import './index.css'

function App() {
  return (
    <AuthProvider>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/board/:type" element={<BoardPage />} />
        <Route path="/notice" element={<BoardPage />} />
        <Route path="/event" element={<BoardPage />} />
        <Route path="/intro" element={<BoardPage />} />
        <Route path="/post/:id" element={<PostPage />} />
        <Route path="/write/:type" element={<WritePage />} />
        <Route path="/mypage" element={<MyPage />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
