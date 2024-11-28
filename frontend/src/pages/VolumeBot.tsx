import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Text,
  Input,
  VStack,
  HStack,
  Switch,
  Button,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Grid,
  GridItem,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
  Tag,
} from '@chakra-ui/react';
import { FaBolt, FaStop } from 'react-icons/fa';
import axios from 'axios';

interface VolumeStats {
  volume24h: number;
  trades: number;
  avgTrade: number;
  status: 'Idle' | 'Running';
}

export default function VolumeBot() {
  const [tokenAddress, setTokenAddress] = useState('');
  const [buyAmount, setBuyAmount] = useState(0.1);
  const [tradingInterval, setTradingInterval] = useState(30);
  const [microBuys, setMicroBuys] = useState(false);
  const [priceBumps, setPriceBumps] = useState(false);
  const [multipleTradingPairs, setMultipleTradingPairs] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<VolumeStats>({
    volume24h: 0,
    trades: 0,
    avgTrade: 0,
    status: 'Idle'
  });
  const [wallets, setWallets] = useState<Array<{
    type: string;
    address: string;
    solBalance: number;
    isSelected: boolean;
  }>>([]);

  const toast = useToast();

  const handleStartBot = async () => {
    if (!tokenAddress) {
      toast({
        title: 'Error',
        description: 'Please enter a token address',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const selectedWallets = wallets.filter(w => w.isSelected).map(w => w.address);
    if (selectedWallets.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one wallet',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const response = await axios.post('http://localhost:4000/api/volume-bot/start', {
        tokenAddress,
        buyAmount,
        tradingInterval,
        settings: {
          microBuys,
          priceBumps,
          multipleTradingPairs
        },
        wallets: selectedWallets
      });

      if (response.data.success) {
        setIsRunning(true);
        setStats(prev => ({ ...prev, status: 'Running' }));
        toast({
          title: 'Success',
          description: 'Volume bot started successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start volume bot',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleStopBot = async () => {
    try {
      await axios.post('http://localhost:4000/api/volume-bot/stop');
      setIsRunning(false);
      setStats(prev => ({ ...prev, status: 'Idle' }));
      toast({
        title: 'Success',
        description: 'Volume bot stopped successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to stop volume bot',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const loadWallets = async () => {
    try {
      const response = await axios.get('http://localhost:4000/api/wallets');
      setWallets(response.data.map((w: any) => ({
        ...w,
        isSelected: false
      })));
    } catch (error) {
      toast({
        title: 'Error loading wallets',
        description: 'Failed to load wallet information',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleWalletSelection = (address: string) => {
    setWallets(prev => prev.map(w => 
      w.address === address ? { ...w, isSelected: !w.isSelected } : w
    ));
  };

  const handleSelectAll = () => {
    setWallets(prev => prev.map(w => ({ ...w, isSelected: true })));
  };

  const handleSelectNone = () => {
    setWallets(prev => prev.map(w => ({ ...w, isSelected: false })));
  };

  // Update stats periodically
  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(async () => {
        try {
          const response = await axios.get('http://localhost:4000/api/volume-bot/stats');
          setStats(response.data);
        } catch (error) {
          console.error('Failed to fetch stats:', error);
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isRunning]);

  useEffect(() => {
    loadWallets();
  }, []);

  return (
    <Box p={4}>
      <Heading size="lg" mb={2}>Volume Bot</Heading>
      <Text mb={6} color="gray.400">Boost Your Token's Volume in Multiple Ways</Text>

      <Grid templateColumns="1fr 350px" gap={6}>
        <GridItem>
          <Card bg="gray.800">
            <CardHeader>
              <Heading size="md">Configuration</Heading>
              <Text color="gray.400" mt={2}>Set up your volume bot parameters</Text>
            </CardHeader>
            <CardBody>
              <VStack spacing={6} align="stretch">
                <Box>
                  <Text mb={2}>Token Address</Text>
                  <Input
                    placeholder="Enter token address"
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                  />
                </Box>

                <Box>
                  <Text mb={2}>Buy Amount (SOL)</Text>
                  <Slider
                    value={buyAmount}
                    min={0.01}
                    max={1}
                    step={0.01}
                    onChange={(val) => setBuyAmount(val)}
                  >
                    <SliderTrack bg="gray.600">
                      <SliderFilledTrack bg="purple.500" />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <Text mt={1} textAlign="right">{buyAmount.toFixed(2)} SOL</Text>
                </Box>

                <Box>
                  <Text mb={2}>Trading Interval (seconds)</Text>
                  <Slider
                    value={tradingInterval}
                    min={5}
                    max={300}
                    step={1}
                    onChange={(val) => setTradingInterval(val)}
                  >
                    <SliderTrack bg="gray.600">
                      <SliderFilledTrack bg="purple.500" />
                    </SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <Text mt={1} textAlign="right">{tradingInterval} seconds</Text>
                </Box>

                <HStack justify="space-between">
                  <Text>Enable Micro-Buys</Text>
                  <Switch
                    isChecked={microBuys}
                    onChange={(e) => setMicroBuys(e.target.checked)}
                    colorScheme="purple"
                  />
                </HStack>

                <HStack justify="space-between">
                  <Text>Enable Price Bumps</Text>
                  <Switch
                    isChecked={priceBumps}
                    onChange={(e) => setPriceBumps(e.target.checked)}
                    colorScheme="purple"
                  />
                </HStack>

                <HStack justify="space-between">
                  <Text>Multiple Trading Pairs</Text>
                  <Switch
                    isChecked={multipleTradingPairs}
                    onChange={(e) => setMultipleTradingPairs(e.target.checked)}
                    colorScheme="purple"
                  />
                </HStack>

                <Box>
                  <Text mb={2}>Select Wallets</Text>
                  <Card bg="gray.700" mb={4}>
                    <CardBody>
                      <VStack spacing={4}>
                        <HStack w="full" justify="space-between">
                          <Button size="sm" onClick={handleSelectAll}>Select All</Button>
                          <Button size="sm" onClick={handleSelectNone}>Select None</Button>
                        </HStack>
                        
                        <Box maxH="200px" overflowY="auto" w="full">
                          <Table size="sm">
                            <Thead>
                              <Tr>
                                <Th>Use</Th>
                                <Th>Type</Th>
                                <Th>Address</Th>
                                <Th>Balance</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {wallets.map((wallet, idx) => (
                                <Tr key={idx}>
                                  <Td>
                                    <Checkbox
                                      isChecked={wallet.isSelected}
                                      onChange={() => handleWalletSelection(wallet.address)}
                                    />
                                  </Td>
                                  <Td>
                                    <Tag colorScheme={
                                      wallet.type === 'DEV' ? 'purple' : 
                                      wallet.type === 'FUNDING' ? 'blue' :
                                      wallet.type === 'MICRO_TRADE' ? 'green' :
                                      'orange'
                                    }>
                                      {wallet.type}
                                    </Tag>
                                  </Td>
                                  <Td fontSize="xs">
                                    {wallet.address.slice(0, 4)}...{wallet.address.slice(-4)}
                                  </Td>
                                  <Td>{wallet.solBalance} SOL</Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        </Box>
                      </VStack>
                    </CardBody>
                  </Card>
                </Box>
              </VStack>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <VStack spacing={6}>
            <Card bg="gray.800" w="full">
              <CardHeader>
                <Heading size="md">Volume Statistics</Heading>
                <Text color="gray.400" mt={2}>Real-time volume and trading metrics</Text>
              </CardHeader>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between">
                    <Text color="gray.400">24h Volume</Text>
                    <Text>{stats.volume24h} SOL</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text color="gray.400">Trades</Text>
                    <Text>{stats.trades}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text color="gray.400">Avg. Trade</Text>
                    <Text>{stats.avgTrade} SOL</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text color="gray.400">Status</Text>
                    <Text>{stats.status}</Text>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>

            <Card bg="gray.800" w="full">
              <CardHeader>
                <Heading size="md">Quick Actions</Heading>
                <Text color="gray.400" mt={2}>Control your volume bot</Text>
              </CardHeader>
              <CardBody>
                <VStack spacing={4}>
                  {!isRunning ? (
                    <Button
                      leftIcon={<FaBolt />}
                      colorScheme="purple"
                      w="full"
                      onClick={handleStartBot}
                    >
                      Start Bot
                    </Button>
                  ) : (
                    <Button
                      leftIcon={<FaStop />}
                      colorScheme="red"
                      w="full"
                      onClick={handleStopBot}
                    >
                      Stop Bot
                    </Button>
                  )}
                </VStack>
              </CardBody>
            </Card>
          </VStack>
        </GridItem>
      </Grid>
    </Box>
  );
} 