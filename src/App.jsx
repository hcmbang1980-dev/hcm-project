import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import BoardPage from './pages/BoardPage'
import PostPage from './pages/PostPage'
import WritePage from './pages/WritePage'
import MyPage from './pages/MyPage'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage2'
import AttendancePage from './pages/AttendancePage'
import './index.css'

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()
    if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'50vh',color:'#d4af37'}}>로딩 중...</div>div>
        if (!user) return <Navigate to="/login" replace />
    return children
}

function App() {
    return (
          <AuthProvider>
                <Header />
                <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/board/:type" element={<ProtectedRoute><BoardPage /></ProtectedRoute>ProtectedRoute>} />
                                <Route path="/notice" element={<ProtectedRoute><BoardPage /></ProtectedRoute>ProtectedRoute>} />
                                        <Route path="/event" element={<ProtectedRoute><BoardPage /></ProtectedRoute>ProtectedRoute>} />
                                                <Route path="/intro" element={<ProtectedRoute><BoardPage /></ProtectedRoute>ProtectedRoute>} />
                                                        <Route path="/post/:id" element={<ProtectedRoute><PostPage /></ProtectedRoute>ProtectedRoute>} />
                                                                <Route path="/write/:type" element={<ProtectedRoute><WritePage /></ProtectedRoute>ProtectedRoute>} />
                                                                        <Route path="/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>ProtectedRoute>} />
                                                                                <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>ProtectedRoute>} />
                                                                                        <Route path="/attendance" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>ProtectedRoute>} />
                                                                                        </Route>Routes>
                                                                                </Route>AuthProvider>
                                                                          )
                                                                          }
                                                                        
                                                                        export default App</AuthProvider>
