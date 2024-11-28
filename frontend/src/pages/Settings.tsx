import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  useToast
} from '@chakra-ui/react';

export default function Settings() {
  const [settings, setSettings] = useState({
    rpcUrl: '',
    wsUrl: '',
    blockEngineUrl: '',
    jitoTipSecretKey: '',
    walletBuyersFolder: '',
    secretKeyPath: '',
    jitoTipAmount: ''
  });

  const toast = useToast();

  const handleSave = async () => {
    try {
      // Implement settings save logic
      toast({
        title: 'Settings Saved',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <Heading size="md">Settings</Heading>
      </CardHeader>
      <CardBody>
        <VStack spacing={4}>
          <FormControl>
            <FormLabel>RPC URL</FormLabel>
            <Input
              value={settings.rpcUrl}
              onChange={(e) => setSettings({...settings, rpcUrl: e.target.value})}
            />
          </FormControl>
          <FormControl>
            <FormLabel>WebSocket URL</FormLabel>
            <Input
              value={settings.wsUrl}
              onChange={(e) => setSettings({...settings, wsUrl: e.target.value})}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Block Engine URL</FormLabel>
            <Input
              value={settings.blockEngineUrl}
              onChange={(e) => setSettings({...settings, blockEngineUrl: e.target.value})}
            />
          </FormControl>
          <Button colorScheme="blue" width="full" onClick={handleSave}>
            Save Settings
          </Button>
        </VStack>
      </CardBody>
    </Card>
  );
} 