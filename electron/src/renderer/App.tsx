// Router and layout shell. Defines all routes and wraps app pages in the Layout (sidebar + content).

import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import SessionControls from './components/SessionControls'
import Settings from './components/Settings'
import SessionHistory from './components/SessionHistory'
import OnboardingPage from './pages/OnboardingPage'
import MiniTimerPage from './pages/MiniTimerPage'

function Sidebar() {
  return (
    <nav className="w-48 h-screen border-r border-gray-700 p-4 flex flex-col gap-4">
      <h2 className="text-white font-bold text-lg">Taskmaster</h2>
      <ul className="flex flex-col gap-2">
        <li><NavLink to="/dashboard" className="text-gray-400 hover:text-white">Dashboard</NavLink></li>
        <li><NavLink to="/session" className="text-gray-400 hover:text-white">Session</NavLink></li>
        <li><NavLink to="/history" className="text-gray-400 hover:text-white">History</NavLink></li>
        <li><NavLink to="/settings" className="text-gray-400 hover:text-white">Settings</NavLink></li>
      </ul>
    </nav>
  )
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<OnboardingPage />} />
        <Route path="/mini-timer" element={<MiniTimerPage />} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/session" element={<Layout><SessionControls /></Layout>} />
        <Route path="/history" element={<Layout><SessionHistory /></Layout>} />
        <Route path="/settings" element={<Layout><Settings /></Layout>} />
      </Routes>
    </HashRouter>
  )
}
