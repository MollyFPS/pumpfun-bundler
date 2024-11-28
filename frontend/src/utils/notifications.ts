import { useToast, UseToastOptions } from '@chakra-ui/react';

interface NotificationOptions extends Omit<UseToastOptions, 'status'> {
  type: 'success' | 'error' | 'warning' | 'info';
}

export function useNotification() {
  const toast = useToast();

  const notify = ({ type, title, description, ...rest }: NotificationOptions) => {
    toast({
      title,
      description,
      status: type,
      duration: 5000,
      isClosable: true,
      position: 'top-right',
      ...rest,
    });
  };

  return {
    success: (title: string, description?: string) => 
      notify({ type: 'success', title, description }),
    error: (title: string, description?: string) => 
      notify({ type: 'error', title, description }),
    warning: (title: string, description?: string) => 
      notify({ type: 'warning', title, description }),
    info: (title: string, description?: string) => 
      notify({ type: 'info', title, description }),
  };
} 