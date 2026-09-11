import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Calendario from './pages/Calendario'
import ElencoCorsi from './pages/ElencoCorsi'
import GestionePartecipanti from './pages/GestionePartecipanti'
import GestioneAccount from './pages/GestioneAccount'
import Report from './pages/Report'
import Mapping from './pages/Mapping'
import GestioneStore from './pages/GestioneStore'
import ConfigStore from './pages/ConfigStore'
import CatalogoAttivita from './pages/CatalogoAttivita'
import GestioneHost from './pages/GestioneHost'
import GestioneRuoli from './pages/GestioneRuoli'
import Completamento from './pages/Completamento'
import Development from './pages/Development'
import AuditLog from './pages/AuditLog'
import GestioneAree from './pages/GestioneAree'
import EccezioniCalendario from './pages/EccezioniCalendario'
import Stats from './pages/Stats'
import RichiesteModifica from './pages/RichiesteModifica'
import IscrizioniStore from './pages/IscrizioniStore'
import EHS from './pages/EHS'
import GestioneFornitoriEHS from './pages/GestioneFornitoriEHS'
import GestioneCorsiEHS from './pages/GestioneCorsiEHS'

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-center"><div className="spinner" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.livello_accesso)) return <Navigate to="/" replace />
  return children
}

// Il livello 'fornitore' ha accesso solo alla sezione EHS: qualunque altra rotta
// (comprese quelle senza `roles`, quindi altrimenti aperte a tutti) lo rimanda a /ehs.
function FornitoreGuard({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (user?.livello_accesso === 'fornitore' && !location.pathname.startsWith('/ehs')) {
    return <Navigate to="/ehs" replace />
  }
  return children
}

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <ProtectedRoute><FornitoreGuard><AppLayout /></FornitoreGuard></ProtectedRoute>,
    children: [
      { index: true, element: <Calendario /> },
      { path: 'ehs', element: <EHS /> },
      { path: 'ehs/fornitori', element: <ProtectedRoute roles={['admin','admin_ehs','ho']}><GestioneFornitoriEHS /></ProtectedRoute> },
      { path: 'ehs/corsi', element: <ProtectedRoute roles={['admin','admin_ehs','ho']}><GestioneCorsiEHS /></ProtectedRoute> },
      { path: 'corsi', element: <ElencoCorsi /> },
      { path: 'iscrizioni', element: <GestionePartecipanti /> },
      { path: 'account', element: <ProtectedRoute roles={['admin','ho','store']}><GestioneAccount /></ProtectedRoute> },
      { path: 'report', element: <Report /> },
      { path: 'mapping', element: <Mapping /> },
      { path: 'store', element: <ProtectedRoute roles={['admin']}><GestioneStore /></ProtectedRoute> },
      { path: 'store-config', element: <ProtectedRoute roles={['admin']}><ConfigStore /></ProtectedRoute> },
      { path: 'aree', element: <ProtectedRoute roles={['admin']}><GestioneAree /></ProtectedRoute> },
      { path: 'eccezioni', element: <ProtectedRoute roles={['admin','admin_ehs','ho']}><EccezioniCalendario /></ProtectedRoute> },
      { path: 'attivita', element: <ProtectedRoute roles={['admin','ho']}><CatalogoAttivita /></ProtectedRoute> },
      { path: 'host', element: <ProtectedRoute roles={['admin','ho']}><GestioneHost /></ProtectedRoute> },
      { path: 'ruoli', element: <ProtectedRoute roles={['admin','ho']}><GestioneRuoli /></ProtectedRoute> },
      { path: 'disattivati', element: <ProtectedRoute roles={['admin','admin_ehs']}><GestioneAccount mostraDisattivati={true} /></ProtectedRoute> },
      { path: 'completamento', element: <Completamento /> },
      { path: 'development', element: <ProtectedRoute roles={['admin','admin_ehs','ho','area']}><Development /></ProtectedRoute> },
      { path: 'audit', element: <ProtectedRoute roles={['admin','admin_ehs','ho']}><AuditLog /></ProtectedRoute> },
      { path: 'stats', element: <ProtectedRoute roles={['admin','admin_ehs','ho','area']}><Stats /></ProtectedRoute> },
      { path: 'richieste', element: <ProtectedRoute roles={['admin','ho']}><RichiesteModifica /></ProtectedRoute> },
      { path: 'iscrizioni-store', element: <ProtectedRoute roles={['store']}><IscrizioniStore /></ProtectedRoute> },
    ],
  },
])
