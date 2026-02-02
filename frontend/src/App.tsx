import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Farms from './pages/Farms'
import FarmDetail from './pages/FarmDetail'
import Analysis from './pages/Analysis'
import FarmAnalysis from './pages/FarmAnalysis'

function App() {
  return (
    <>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="farms" element={<Farms />} />
          <Route path="farms/:id" element={<FarmDetail />} />
          <Route path="farms/:id/analysis" element={<FarmAnalysis />} />
          <Route path="analysis" element={<Analysis />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
