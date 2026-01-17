import { useState, useEffect } from 'react'
import './App.css'
import { FiYoutube, FiList, FiSettings, FiBarChart2 } from 'react-icons/fi'
import Settings from './components/Settings'
import VideoSync from './components/VideoSync'
import VideoList from './components/VideoList'
import CategoryManager from './components/CategoryManager'
import Dashboard from './components/Dashboard'
import OAuthCallback from './components/OAuthCallback'
import authService from './services/authService'

function App() {
  const [activeTab, setActiveTab] = useState('videos')
  const [isOAuthCallback, setIsOAuthCallback] = useState(false)

  useEffect(() => {
    if (window.location.pathname === '/oauth/callback') {
      setIsOAuthCallback(true)
    }
    authService.loadTokens()
  }, [])

  if (isOAuthCallback) {
    return (
      <OAuthCallback
        onComplete={(success) => {
          setIsOAuthCallback(false)
          if (success) {
            setActiveTab('settings')
          }
        }}
      />
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1><FiYoutube /> YouTube Learning Manager</h1>
          <p className="subtitle">Track, Categorize & Learn from Your Watch Later Videos</p>
        </div>
      </header>

      <nav className="app-nav">
        <button
          className={activeTab === 'videos' ? 'active' : ''}
          onClick={() => setActiveTab('videos')}
        >
          <FiList /> Videos
        </button>
        <button
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          <FiBarChart2 /> Dashboard
        </button>
        <button
          className={activeTab === 'settings' ? 'active' : ''}
          onClick={() => setActiveTab('settings')}
        >
          <FiSettings /> Settings
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'videos' && (
          <div className="tab-content">
            <VideoSync />
            <CategoryManager />
            <VideoList />
          </div>
        )}
        {activeTab === 'dashboard' && (
          <div className="tab-content">
            <Dashboard />
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="tab-content">
            <Settings />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
