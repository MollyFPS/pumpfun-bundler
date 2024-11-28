import React from 'react';
import {
  Box,
  Button,
  VStack,
  Text,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Grid,
  GridItem,
  useToast
} from '@chakra-ui/react';

export default function BundlerManager() {
  const toast = useToast();

  const handleBundleAction = async (action: string) => {
    toast({
      title: 'Action Started',
      description: `Starting ${action}...`,
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Grid templateColumns="1fr" gap={6}>
      <GridItem>
        <Card>
          <CardHeader>
            <Heading size="md">Bundle Actions</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4}>
              <Button 
                width="full" 
                colorScheme="blue"
                onClick={() => handleBundleAction('Bundle PF Launch')}
              >
                Bundle PF Launch
              </Button>
              <Button 
                width="full" 
                colorScheme="green"
                onClick={() => handleBundleAction('PF Launch with Dev only')}
              >
                PF Launch with Dev only
              </Button>
              <Button 
                width="full" 
                colorScheme="purple"
                onClick={() => handleBundleAction('Bundle + Snipe')}
              >
                Bundle + Snipe
              </Button>
              <Button 
                width="full" 
                colorScheme="orange"
                onClick={() => handleBundleAction('Copy Info Bundler')}
              >
                Copy Info Bundler
              </Button>
            </VStack>
          </CardBody>
        </Card>
      </GridItem>
    </Grid>
  );
} 