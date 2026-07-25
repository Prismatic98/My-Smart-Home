import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from './components/AppLayout/AppLayout.jsx';
import HomePage from './features/home/HomePage.jsx';
import NotesPage from './features/notes/NotesPage.jsx';
import FilesPage from './features/files/FilesPage.jsx';
import SmartHomePage from './features/smarthome/SmartHomePage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="notizen" element={<NotesPage />} />
        <Route path="dateien" element={<FilesPage />} />
        <Route path="smarthome" element={<SmartHomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}