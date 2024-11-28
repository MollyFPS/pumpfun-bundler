import React from 'react';
import { Flex, Text, Button } from '@chakra-ui/react';
import { useSocket } from '../hooks/useSocket';

export default function TopBar() {
  const { priceData, connected } = useSocket();

  return (
    <Flex bg="gray.800" color="white" p="4" justify="space-between" align="center">
      <Text fontSize="xl">Rocket AIO</Text>
      <Flex align="center" gap={4}>
        {connected ? (
          <Text color="green.400" fontSize="sm">●</Text>
        ) : (
          <Text color="red.400" fontSize="sm">●</Text>
        )}
        <Text>{priceData || 'Connecting...'}</Text>
      </Flex>
    </Flex>
  );
} 