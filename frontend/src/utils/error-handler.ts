import { APIError } from './api';
import { useNotification } from './notifications';

export function useErrorHandler() {
  const notify = useNotification();

  const handleError = (error: unknown) => {
    if (error instanceof APIError) {
      notify.error('Error', error.message);
    } else if (error instanceof Error) {
      notify.error('Error', error.message);
    } else {
      notify.error('Error', 'An unexpected error occurred');
    }
  };

  return handleError;
} 