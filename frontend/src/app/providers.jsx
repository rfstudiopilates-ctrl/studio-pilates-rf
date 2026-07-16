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
