import React, { ReactNode } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <Flex h="100vh">
      <Sidebar />
      <Box flex="1">
        <TopBar />
        <Box p="6">
          {children}
        </Box>
      </Box>
    </Flex>
  );
} 