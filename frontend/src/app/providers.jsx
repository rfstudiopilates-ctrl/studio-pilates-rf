import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AuthBootstrap from './AuthBootstrap';
import PwaBootstrap from './PwaBootstrap';
import StudioThemeProvider from './StudioThemeProvider';
import AppRouter from './router';
import ErrorBoundary from '../components/system/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry(failureCount, error) {
        // No repetir errores del cliente ni límites 429: solo aumenta el tráfico.
        if (error?.status && error.status >= 400 && error.status < 500) {
          return false;
        }

        // Reintento breve solo para red o fallos transitorios del servidor.
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    },
    mutations: {
      retry: false,
    },
  },
});

export default function AppProviders({ children }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthBootstrap>
          <PwaBootstrap>
            <StudioThemeProvider>
              <ErrorBoundary>{children ?? <AppRouter />}</ErrorBoundary>
            </StudioThemeProvider>
          </PwaBootstrap>
        </AuthBootstrap>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
