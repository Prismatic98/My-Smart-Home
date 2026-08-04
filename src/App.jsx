import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from './components/AppLayout/AppLayout.jsx';
import HomePage from './features/home/HomePage.jsx';
import NotesPage from './features/notes/NotesPage.jsx';
import FilesPage from './features/files/FilesPage.jsx';
import SmartHomePage from './features/smarthome/SmartHomePage.jsx';
import DeviceDetailPage from './features/smarthome/DeviceDetailPage.jsx';
import ClarityPage from './features/clarity/ClarityPage.jsx';
import ThoughtRecordPage from './features/clarity/ThoughtRecordPage.jsx';
import DistortionsPage from './features/clarity/DistortionsPage.jsx';
import ClarityDebugPage from './features/clarity/ClarityDebugPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="notes" element={<NotesPage />} />
        <Route path="files" element={<FilesPage />} />
        <Route path="smart-home" element={<SmartHomePage />} />
        {/* Eigene Route statt Modal-State: so funktionieren Zurück-Taste und
            Deep-Links auf ein einzelnes Gerät. */}
        <Route path="smart-home/:deviceId" element={<DeviceDetailPage />} />
        <Route path="clarity" element={<ClarityPage />} />
        {/* Wie bei der Gerätedetailseite eine echte Route: der mehrstufige
            Editor hält den Schritt in der URL, damit die Zurück-Taste einen
            Schritt zurückgeht statt das Protokoll zu verlassen. */}
        <Route path="clarity/thoughts/:recordId" element={<ThoughtRecordPage />} />
        <Route path="clarity/denkfehler" element={<DistortionsPage />} />
        {/* Rohe Prüfseite auf der Datenschicht – kein Teil der Oberfläche,
            aber der schnellste Weg, Sync und Bestand zu sehen. */}
        <Route path="clarity/debug" element={<ClarityDebugPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}