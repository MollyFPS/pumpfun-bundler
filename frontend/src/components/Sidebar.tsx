import React from 'react';
import { Box, VStack, Icon, Text, Flex, Heading } from '@chakra-ui/react';
import { Link, useLocation } from 'react-router-dom';
import { IconType } from 'react-icons';
import { 
  FaHome,
  FaWallet, 
  FaCoins,
  FaRobot,
  FaBoxes,
  FaCog,
  FaServer
} from 'react-icons/fa';

interface SidebarItemProps {
  icon: IconType;
  text: string;
  to: string;
  isActive?: boolean;
}

function SidebarItem({ icon, text, to, isActive }: SidebarItemProps) {
  return (
    <Link to={to} style={{ width: '100%' }}>
      <Flex 
        align="center" 
        p="3" 
        borderRadius="md" 
        bg={isActive ? 'purple.600' : 'transparent'}
        _hover={{ bg: isActive ? 'purple.500' : 'gray.700' }}
        transition="all 0.2s"
      >
        <Icon as={icon} mr="3" />
        <Text>{text}</Text>
      </Flex>
    </Link>
  );
}

export default function Sidebar() {
  const location = useLocation();

  return (
    <Box w="64" bg="gray.900" color="white" p="4" borderRight="1px" borderColor="gray.700">
      <VStack spacing="6" align="stretch">
        <Heading size="md" color="purple.400" mb="4">Rocket AIO Bundler</Heading>
        
        <VStack spacing="2" align="stretch">
          <SidebarItem 
            icon={FaHome} 
            text="Home" 
            to="/" 
            isActive={location.pathname === '/'}
          />
          <SidebarItem 
            icon={FaWallet} 
            text="Wallet Manager" 
            to="/wallets"
            isActive={location.pathname === '/wallets'}
          />
          <SidebarItem 
            icon={FaRobot} 
            text="Volume Bot" 
            to="/volume"
            isActive={location.pathname === '/volume'}
          />
          <SidebarItem 
            icon={FaBoxes} 
            text="Micro Trader" 
            to="/trader"
            isActive={location.pathname === '/trader'}
          />
          <SidebarItem 
            icon={FaCoins} 
            text="Bundled Buy" 
            to="/bundled-buy"
            isActive={location.pathname === '/bundled-buy'}
          />
          <SidebarItem 
            icon={FaServer} 
            text="Auto Bundler" 
            to="/auto-bundler"
            isActive={location.pathname === '/auto-bundler'}
          />
          <SidebarItem 
            icon={FaCog} 
            text="Settings" 
            to="/settings"
            isActive={location.pathname === '/settings'}
          />
        </VStack>
      </VStack>
    </Box>
  );
} 