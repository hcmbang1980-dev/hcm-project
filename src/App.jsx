import React from 'react'
import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import BoardPage from './pages/BoardPage'
import PostPage from './pages/PostPage'
import WritePage from './pages/WritePage'
import MyPage from './pages/MyPage'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import AttendancePage from './pages/AttendancePage'
import './index.css'

function ProtectedRoute({ children }) {
      const { user, loading } = useAuth()
      if (loading) {
              const s = {display:'flex',alignItems:'center',justifyContent:'center',height:'50vh',color:'#d4af37'}
              return React.createElement('div', {style:s}, '\ub85c\ub529 \uc911...')
      }
      if (!user) return React.createElement(Navigate, {to:'/login', replace:true})
      return children
}

const W = (Comp) => React.createElement(ProtectedRoute, null, React.createElement(Comp))

export default function App() {
      return React.createElement(AuthProvider, null,
                                     React.createElement(Header, null),
                                     React.createElement(Routes, null,
                                                               React.createElement(Route, {path:'/', element:React.createElement(HomePage)}),
                                                               React.createElement(Route, {path:'/login', element:React.createElement(LoginPage)}),
                                                               React.createElement(Route, {path:'/board/:type', element:W(BoardPage)}),
                                                               React.createElement(Route, {path:'/notice', element:W(BoardPage)}),
                                                               React.createElement(Route, {path:'/event', element:W(BoardPage)}),
                                                               React.createElement(Route, {path:'/intro', element:W(BoardPage)}),
                                                               React.createElement(Route, {path:'/post/:id', element:W(PostPage)}),
                                                               React.createElement(Route, {path:'/write/:type', element:W(WritePage)}),
                                                               React.createElement(Route, {path:'/mypage', element:W(MyPage)}),
                                                               React.createElement(Route, {path:'/admin', element:W(AdminPage)}),
                                                               React.createElement(Route, {path:'/attendance', element:W(AttendancePage)}),
                                                               React.createElement(Route, {path:'/places/:type', element:React.createElement(HomePage)})
                                                             )
                                   )
}
