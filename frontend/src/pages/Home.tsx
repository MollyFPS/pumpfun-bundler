import React from 'react';
import {
  Grid,
  GridItem,
  Box,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Text,
  Input,
  Button,
  VStack,
  useColorModeValue
} from '@chakra-ui/react';

export default function Home() {
  return (
    <Grid templateColumns="1fr 350px" gap={6}>
      <GridItem>
        <VStack spacing={6} align="stretch">
          {/* Live Tweet Monitor */}
          <Card bg="gray.800">
            <CardHeader>
              <Heading size="md">Live Tweet Monitor</Heading>
            </CardHeader>
            <CardBody>
              <Text color="gray.400">No recent tweets</Text>
            </CardBody>
          </Card>

          {/* Transaction Monitor */}
          <Card bg="gray.800">
            <CardHeader>
              <Heading size="md">Transaction Monitor</Heading>
            </CardHeader>
            <CardBody>
              <Text color="gray.400">No recent transactions</Text>
            </CardBody>
          </Card>
        </VStack>
      </GridItem>

      {/* Core Info */}
      <GridItem>
        <Card bg="gray.800">
          <CardHeader>
            <Heading size="md">Core Info</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4}>
              <Box w="full">
                <Text mb={2}>RPC URL</Text>
                <Input 
                  placeholder="Enter RPC URL"
                  bg="gray.700"
                  border="none"
                />
              </Box>
              <Box w="full">
                <Text mb={2}>WebSocket URL</Text>
                <Input 
                  placeholder="Enter WebSocket URL"
                  bg="gray.700"
                  border="none"
                />
              </Box>
              <Button colorScheme="purple" w="full">
                Connect
              </Button>
            </VStack>
          </CardBody>
        </Card>
      </GridItem>
    </Grid>
  );
} 