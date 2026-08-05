import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from './components/AppLayout/AppLayout.jsx';
import HomePage from './features/home/HomePage.jsx';
import NotesPage from './features/notes/NotesPage.jsx';
import FilesPage from './features/files/FilesPage.jsx';
import SmartHomePage from './features/smarthome/SmartHomePage.jsx';
import DeviceDetailPage from './features/smarthome/DeviceDetailPage.jsx';
import PauseHomePage from './features/pause/PauseHomePage.jsx';
import ThoughtRecordsPage from './features/pause/ThoughtRecordsPage.jsx';
import ThoughtRecordPage from './features/pause/ThoughtRecordPage.jsx';
import DistortionsPage from './features/pause/DistortionsPage.jsx';
import PauseDebugPage from './features/pause/PauseDebugPage.jsx';
import SettingsPage from './features/settings/SettingsPage.jsx';

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
        {/* Die Modulseite ist eine reine Auswahl – dieselben Kacheln wie auf
            der Startseite der App. */}
        <Route path="pause" element={<PauseHomePage />} />
        <Route path="pause/thoughts" element={<ThoughtRecordsPage />} />
        {/* Wie bei der Gerätedetailseite eine echte Route: der mehrstufige
            Editor hält den Schritt in der URL, damit die Zurück-Taste einen
            Schritt zurückgeht statt das Protokoll zu verlassen. */}
        <Route path="pause/thoughts/:recordId" element={<ThoughtRecordPage />} />
        <Route path="pause/denkfehler" element={<DistortionsPage />} />
        {/* Rohe Prüfseite auf der Datenschicht – kein Teil der Oberfläche,
            aber der schnellste Weg, Sync und Bestand zu sehen. */}
        <Route path="pause/debug" element={<PauseDebugPage />} />
        {/* Einstellungen sind kein Modul: nur über das Zahnrad unten im
            Menü erreichbar, keine Kachel auf der Startseite. */}
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}