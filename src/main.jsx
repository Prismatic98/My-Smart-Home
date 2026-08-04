import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClientProvider } from '@tanstack/react-query';

// Reihenfolge zählt: die Styles der Zusatzpakete bauen auf denen von
// @mantine/core auf, die eigenen kommen zuletzt.
import '@mantine/core/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/tiptap/styles.css';
import './styles/global.scss';

import App from './App.jsx';
import ClaritySyncWorker from './features/clarity/ClaritySyncWorker.jsx';
import NotesSyncWorker from './features/notes/NotesSyncWorker.jsx';
import { HAProvider } from './lib/HAProvider.jsx';
import { theme } from './lib/theme.js';
import { queryClient } from './lib/queryClient.js';

// Devtools nur im Dev-Build laden – landen so nicht im Produktions-Bundle.
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools }))
    )
  : () => null;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Notifications position="top-right" limit={4} />
      <QueryClientProvider client={queryClient}>
        {/* Hintergrundprozesse ohne eigene Darstellung – siehe NotesSyncWorker. */}
        <NotesSyncWorker />
        <ClaritySyncWorker />
        <HAProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </HAProvider>
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        </Suspense>
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>
);