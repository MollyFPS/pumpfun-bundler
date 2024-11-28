import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  styles: {
    global: {
      body: {
        bg: 'gray.900',
        color: 'white',
      },
    },
  },
  components: {
    Card: {
      baseStyle: {
        container: {
          bg: 'gray.800',
          borderRadius: 'lg',
        },
      },
    },
  },
});

export default theme; 