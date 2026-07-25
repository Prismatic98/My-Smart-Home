import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { QueryClientProvider } from '@tanstack/react-query';

import '@mantine/core/styles.css';
import './styles/global.scss';

import App from './App.jsx';
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
      <QueryClientProvider client={queryClient}>
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