import { Flex, Spinner } from '@chakra-ui/react';

export default function LoadingSpinner() {
  return (
    <Flex justify="center" align="center" h="100%">
      <Spinner size="xl" color="blue.500" />
    </Flex>
  );
} 