import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import Dashboard from './pages/Dashboard'
import Openings from './pages/Openings'
import Progress from './pages/Progress'
import RepertoireDetail from './pages/RepertoireDetail'
import Repertoires from './pages/Repertoires'
import Train from './pages/Train'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="/repertoire" element={<Repertoires />} />
        <Route path="/repertoire/:id" element={<RepertoireDetail />} />
        <Route path="/openings" element={<Openings />} />
        <Route path="/train" element={<Train />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
