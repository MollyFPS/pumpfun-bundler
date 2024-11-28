import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import { LoadingProvider } from './contexts/LoadingContext';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import AppRoutes from './routes';
import ErrorBoundary from './components/ErrorBoundary';
import theme from './theme';

function App() {
  return (
    <ChakraProvider theme={theme}>
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <LoadingProvider>
              <Layout>
                <AppRoutes />
              </Layout>
            </LoadingProvider>
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </ChakraProvider>
  );
}

export default App; 