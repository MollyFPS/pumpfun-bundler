import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  useToast,
  Grid,
  GridItem,
  Text,
  Card,
  CardBody,
  CardHeader,
  Heading
} from '@chakra-ui/react';
import { createToken, TokenCreateParams } from '../api';
import { useErrorHandler } from '../utils/error-handler';
import { useLoading } from '../contexts/LoadingContext';
import axios from 'axios';

export default function TokenManager() {
  const [formData, setFormData] = useState<TokenCreateParams>({
    name: '',
    symbol: '',
    decimals: 9,
    imageUrl: '',
    socials: {
      telegram: '',
      twitter: '',
      website: ''
    }
  });
  const toast = useToast();
  const handleError = useErrorHandler();
  const { setLoading } = useLoading();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
        // First check if server is available
        const healthCheck = await axios.get('http://localhost:4000/api/health').catch(() => null);
        if (!healthCheck) {
            throw new Error('Server is not running. Please start the server first.');
        }

        const response = await axios.post('http://localhost:4000/api/token/create', formData);
        
        if (response.data.success) {
            toast({
                title: 'Token Created',
                description: `Token ${formData.name} created successfully!\nMint: ${response.data.data.mint}\nPump.fun: ${response.data.data.pumpFunLink}`,
                status: 'success',
                duration: 10000,
                isClosable: true,
            });
        } else {
            throw new Error(response.data.error || 'Failed to create token');
        }
    } catch (error: any) {
        toast({
            title: 'Error Creating Token',
            description: error.message || 'An unexpected error occurred',
            status: 'error',
            duration: 5000,
            isClosable: true,
        });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Grid templateColumns="repeat(2, 1fr)" gap={6}>
      <GridItem>
        <Card>
          <CardHeader>
            <Heading size="md">Create New Token</Heading>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Token Name</FormLabel>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Symbol</FormLabel>
                  <Input
                    value={formData.symbol}
                    onChange={(e) => setFormData({...formData, symbol: e.target.value})}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Decimals</FormLabel>
                  <Input
                    type="number"
                    value={formData.decimals}
                    onChange={(e) => setFormData({...formData, decimals: parseInt(e.target.value)})}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Image URL</FormLabel>
                  <Input
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                  />
                </FormControl>
                <Button type="submit" colorScheme="blue" width="full">
                  Create Token
                </Button>
              </VStack>
            </form>
          </CardBody>
        </Card>
      </GridItem>
      <GridItem>
        <Card>
          <CardHeader>
            <Heading size="md">Token Management</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4}>
              <Button width="full" colorScheme="purple">
                Manage Volume
              </Button>
              <Button width="full" colorScheme="green">
                View Token Info
              </Button>
              <Button width="full" colorScheme="orange">
                Migrate to Raydium
              </Button>
            </VStack>
          </CardBody>
        </Card>
      </GridItem>
    </Grid>
  );
} 