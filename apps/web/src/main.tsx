import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { trpc, createTRPCClient, isUnauthorizedError, clearAuthAndRedirect } from './lib/trpc';
import { AuthProvider } from './contexts/AuthContext';
import { OfflineProvider } from './contexts/OfflineContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import App from './App';
import './index.css';

function Root() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: (failureCount, error) => {
              // Don't retry on UNAUTHORIZED - redirect to login instead
              if (isUnauthorizedError(error)) {
                return false;
              }
              return failureCount < 3;
            },
          },
          mutations: {
            retry: (failureCount, error) => {
              if (isUnauthorizedError(error)) {
                return false;
              }
              return failureCount < 1;
            },
          },
        },
      })
  );

  const [trpcClient] = useState(() => createTRPCClient());

  // Global error handler for UNAUTHORIZED errors
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.state.status === 'error') {
        const error = event.query.state.error;
        if (isUnauthorizedError(error)) {
          clearAuthAndRedirect();
        }
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  return (
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <OfflineProvider>
              <AuthProvider>
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 5000,
                    ariaProps: {
                      role: 'status',
                      'aria-live': 'polite',
                    },
                  }}
                />
                <PWAUpdatePrompt />
                <PWAInstallPrompt />
                <App />
              </AuthProvider>
            </OfflineProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
