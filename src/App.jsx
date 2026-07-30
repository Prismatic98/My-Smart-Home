import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from './components/AppLayout/AppLayout.jsx';
import HomePage from './features/home/HomePage.jsx';
import NotesPage from './features/notes/NotesPage.jsx';
import FilesPage from './features/files/FilesPage.jsx';
import SmartHomePage from './features/smarthome/SmartHomePage.jsx';
import DeviceDetailPage from './features/smarthome/DeviceDetailPage.jsx';

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}