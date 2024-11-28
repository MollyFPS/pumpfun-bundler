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
  Button,
  Grid,
  GridItem,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Radio,
  RadioGroup,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  InputGroup,
  InputRightElement,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Checkbox,
  Tag,
  Stack,
  Image,
  Skeleton,
  SkeletonText,
  Select
} from '@chakra-ui/react';
import { FaUpload, FaPlus, FaQuestionCircle } from 'react-icons/fa';
import axios from 'axios';

interface WalletInfo {
  address: string;
  solBalance: number;
  tokenBalance: number;
  type: 'DEV' | 'FUNDING' | 'MICRO_TRADE' | 'VOLUME_BOT';
}

interface MicroTraderConfig {
  tokenAddress: string;
  transactionAmount: {
    min: number;
    max: number;
  };
  taskInterval: number;
  walletExecutionOrder: 'Sequential' | 'Random';
  jitoMevTip: number;
}

interface WalletSelection {
  address: string;
  isSelected: boolean;
}

interface TokenInfo {
  name: string;
  symbol: string;
  marketCap: number;
  volume24h: number;
  price: number;
  imageUrl: string;
}

export default function MicroTrader() {
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [config, setConfig] = useState<MicroTraderConfig>({
    tokenAddress: '',
    transactionAmount: {
      min: 0.001,
      max: 0.01
    },
    taskInterval: 100,
    walletExecutionOrder: 'Sequential',
    jitoMevTip: 0.001
  });
  const [isRunning, setIsRunning] = useState(false);
  const toast = useToast();
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [numWalletsToGenerate, setNumWalletsToGenerate] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWallets, setSelectedWallets] = useState<WalletSelection[]>([]);
  const [walletTypeToGenerate, setWalletTypeToGenerate] = useState<'DEV' | 'FUNDING' | 'MICRO_TRADE' | 'VOLUME_BOT'>('MICRO_TRADE');
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [tokenAddress, setTokenAddress] = useState('');
  const [selectedProxy, setSelectedProxy] = useState('');
  const [availableProxies, setAvailableProxies] = useState<string[]>([]);

  // Load wallets
  const loadWallets = async () => {
    try {
      const response = await axios.get('http://localhost:4000/api/wallets');
      const loadedWallets = response.data;
      setWallets(loadedWallets);
      // Initialize selectedWallets with all wallets unselected
      setSelectedWallets(loadedWallets.map((w: WalletInfo) => ({
        address: w.address,
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

  useEffect(() => {
    loadWallets();
  }, []);

  // Import wallets
  const handleImportWallets = async () => {
    // Implement wallet import functionality
  };

  // Generate wallets
  const handleGenerateWallets = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post('http://localhost:4000/api/wallets/generate', {
        count: numWalletsToGenerate,
        type: walletTypeToGenerate
      });

      if (response.data.success) {
        toast({
          title: 'Success',
          description: `Generated ${numWalletsToGenerate} new ${walletTypeToGenerate} wallets successfully`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        await loadWallets(); // Refresh the wallet list
      } else {
        throw new Error(response.data.error || 'Failed to generate wallets');
      }
      setIsGenerateModalOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate wallets',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update configuration
  const updateConfig = (key: keyof MicroTraderConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // Start/Stop trading
  const toggleTrading = async () => {
    try {
      if (!isRunning) {
        const selectedAddresses = selectedWallets
          .filter(w => w.isSelected)
          .map(w => w.address);

        if (selectedAddresses.length === 0) {
          toast({
            title: 'Error',
            description: 'Please select at least one wallet',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
          return;
        }

        await axios.post('http://localhost:4000/api/micro-trader/start', {
          ...config,
          wallets: selectedAddresses
        });
        setIsRunning(true);
        toast({
          title: 'Trading Started',
          description: `Started trading with ${selectedAddresses.length} wallets`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        await axios.post('http://localhost:4000/api/micro-trader/stop');
        setIsRunning(false);
        toast({
          title: 'Trading Stopped',
          description: 'Micro trader has been stopped',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: isRunning ? 'Failed to stop trading' : 'Failed to start trading',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const GenerateWalletsModal = () => (
    <Modal isOpen={isGenerateModalOpen} onClose={() => setIsGenerateModalOpen(false)}>
      <ModalOverlay />
      <ModalContent bg="gray.800">
        <ModalHeader>Generate Wallets</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Wallet Type</FormLabel>
              <RadioGroup value={walletTypeToGenerate} onChange={(value: 'DEV' | 'FUNDING' | 'MICRO_TRADE' | 'VOLUME_BOT') => setWalletTypeToGenerate(value)}>
                <Stack direction="column" spacing={2}>
                  <Radio value="DEV">Dev Wallet</Radio>
                  <Radio value="FUNDING">Funding Wallet</Radio>
                  <Radio value="MICRO_TRADE">Micro Trade Wallet</Radio>
                  <Radio value="VOLUME_BOT">Volume Bot Wallet</Radio>
                </Stack>
              </RadioGroup>
            </FormControl>

            <FormControl>
              <FormLabel>Number of Wallets to Generate</FormLabel>
              <NumberInput
                value={numWalletsToGenerate}
                min={1}
                max={20}
                onChange={(value) => setNumWalletsToGenerate(parseInt(value))}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button
            colorScheme="gray"
            mr={3}
            onClick={() => setIsGenerateModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            colorScheme="purple"
            onClick={handleGenerateWallets}
            isLoading={isLoading}
          >
            Generate
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );

  // Add wallet selection handler
  const handleWalletSelection = (address: string) => {
    setSelectedWallets(prev => prev.map(wallet => 
      wallet.address === address 
        ? { ...wallet, isSelected: !wallet.isSelected }
        : wallet
    ));
  };

  // Add select all/none handlers
  const handleSelectAll = () => {
    setSelectedWallets(prev => prev.map(wallet => ({
      ...wallet,
      isSelected: true
    })));
  };

  const handleSelectNone = () => {
    setSelectedWallets(prev => prev.map(wallet => ({
      ...wallet,
      isSelected: false
    })));
  };

  // Add proxy loading function
  useEffect(() => {
    const loadProxies = async () => {
      try {
        const response = await axios.get('http://localhost:4000/api/proxies');
        setAvailableProxies(response.data);
      } catch (error) {
        console.error('Failed to load proxies:', error);
      }
    };
    loadProxies();
  }, []);

  // Update the token lookup function to use proxy
  const lookupToken = async () => {
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

    try {
      setIsLoadingToken(true);
      const response = await axios.get(`http://localhost:4000/api/token/${tokenAddress}`, {
        params: {
          proxy: selectedProxy
        }
      });
      
      if (response.data.success) {
        setTokenInfo(response.data.data);
        updateConfig('tokenAddress', tokenAddress);
        toast({
          title: 'Success',
          description: 'Token found successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error('Failed to find token');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to find token on pump.fun',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setTokenInfo(null);
    } finally {
      setIsLoadingToken(false);
    }
  };

  return (
    <Box p={4}>
      <Heading size="lg" mb={2}>Pump Micro Trading</Heading>
      <Text mb={6} color="gray.400">
        Micro trading through quick small transactions, ensures that your project is always visible on the Pump homepage
      </Text>

      <Card bg="gray.800" mb={6}>
        <CardHeader>
          <Heading size="md">Trading Configuration</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={6} align="stretch">
            <Box>
              <Text mb={2}>Enter Pump.fun Token URL</Text>
              <VStack spacing={4} align="stretch">
                <HStack>
                  <Input
                    placeholder="https://pump.fun/coin/your-token-address"
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                  />
                  <Button
                    colorScheme="purple"
                    onClick={lookupToken}
                    isLoading={isLoadingToken}
                  >
                    Submit
                  </Button>
                </HStack>

                {isLoadingToken ? (
                  <Card bg="gray.700" p={4}>
                    <HStack spacing={4}>
                      <Skeleton height="60px" width="60px" borderRadius="md" />
                      <VStack align="stretch" flex={1}>
                        <SkeletonText noOfLines={3} spacing={2} />
                      </VStack>
                    </HStack>
                  </Card>
                ) : tokenInfo ? (
                  <Card bg="gray.700" p={4}>
                    <HStack spacing={4} align="start">
                      <Image
                        src={tokenInfo.imageUrl}
                        fallbackSrc="https://via.placeholder.com/60"
                        alt={tokenInfo.name}
                        boxSize="60px"
                        objectFit="cover"
                        borderRadius="md"
                      />
                      <VStack align="stretch" flex={1} spacing={1}>
                        <HStack justify="space-between">
                          <Text fontWeight="bold">{tokenInfo.name}</Text>
                          <Text>{tokenInfo.symbol}</Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text color="gray.400">Price:</Text>
                          <Text>${tokenInfo.price.toFixed(6)}</Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text color="gray.400">Market Cap:</Text>
                          <Text>${tokenInfo.marketCap.toLocaleString()}</Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text color="gray.400">24h Volume:</Text>
                          <Text>${tokenInfo.volume24h.toLocaleString()}</Text>
                        </HStack>
                      </VStack>
                    </HStack>
                  </Card>
                ) : null}
              </VStack>
            </Box>

            <Grid templateColumns="1fr 1fr" gap={6}>
              <GridItem>
                <Card bg="gray.900" p={4}>
                  <CardHeader p={0}>
                    <Heading size="sm" mb={4}>Wallet Management</Heading>
                  </CardHeader>
                  <CardBody p={0}>
                    <VStack spacing={4}>
                      <Button
                        leftIcon={<FaUpload />}
                        colorScheme="purple"
                        variant="outline"
                        w="full"
                        onClick={handleImportWallets}
                      >
                        Import Wallets
                      </Button>
                      <Button
                        leftIcon={<FaPlus />}
                        colorScheme="purple"
                        variant="outline"
                        w="full"
                        onClick={() => setIsGenerateModalOpen(true)}
                      >
                        Generate Wallets
                      </Button>
                      
                      {/* Add wallet selection buttons */}
                      <HStack w="full" spacing={2}>
                        <Button
                          size="sm"
                          colorScheme="blue"
                          variant="outline"
                          onClick={handleSelectAll}
                        >
                          Select All
                        </Button>
                        <Button
                          size="sm"
                          colorScheme="blue"
                          variant="outline"
                          onClick={handleSelectNone}
                        >
                          Select None
                        </Button>
                      </HStack>

                      {/* Add wallet list with checkboxes */}
                      <Box maxH="200px" overflowY="auto" w="full">
                        <Table size="sm" variant="simple">
                          <Thead position="sticky" top={0} bg="gray.900">
                            <Tr>
                              <Th px={2}>Use</Th>
                              <Th>Type</Th>
                              <Th>Address</Th>
                              <Th isNumeric>Balance</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {wallets.map((wallet, idx) => (
                              <Tr key={idx}>
                                <Td px={2}>
                                  <Checkbox
                                    isChecked={selectedWallets.find(w => w.address === wallet.address)?.isSelected}
                                    onChange={() => handleWalletSelection(wallet.address)}
                                    colorScheme="purple"
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
                                <Td fontSize="xs" fontFamily="mono">
                                  {wallet.address.slice(0, 4)}...{wallet.address.slice(-4)}
                                </Td>
                                <Td isNumeric>{wallet.solBalance} SOL</Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </Box>

                      <Box mt={4}>
                        <HStack justify="space-between" mb={2}>
                          <Text>Selected Wallets</Text>
                          <Text>{selectedWallets.filter(w => w.isSelected).length}</Text>
                        </HStack>
                        <HStack justify="space-between" mb={2}>
                          <Text>Total SOL Balance</Text>
                          <Text>
                            {wallets
                              .filter(w => selectedWallets.find(sw => sw.address === w.address)?.isSelected)
                              .reduce((sum, w) => sum + w.solBalance, 0)
                              .toFixed(2)} SOL
                          </Text>
                        </HStack>
                      </Box>
                    </VStack>
                  </CardBody>
                </Card>
              </GridItem>

              <GridItem>
                <Card bg="gray.900" p={4}>
                  <CardHeader p={0}>
                    <Heading size="sm" mb={4}>Transaction Settings</Heading>
                  </CardHeader>
                  <CardBody p={0}>
                    <VStack spacing={4} align="stretch">
                      <Box>
                        <HStack justify="space-between" mb={1}>
                          <Text>Transaction Amount (SOL)</Text>
                          <IconButton
                            aria-label="Help"
                            icon={<FaQuestionCircle />}
                            size="sm"
                            variant="ghost"
                          />
                        </HStack>
                        <Grid templateColumns="1fr 1fr" gap={2}>
                          <NumberInput
                            value={config.transactionAmount.min}
                            min={0.001}
                            max={config.transactionAmount.max}
                            step={0.001}
                            onChange={(value) => updateConfig('transactionAmount', { ...config.transactionAmount, min: parseFloat(value) })}
                          >
                            <NumberInputField placeholder="Min" />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                          <NumberInput
                            value={config.transactionAmount.max}
                            min={config.transactionAmount.min}
                            max={1}
                            step={0.001}
                            onChange={(value) => updateConfig('transactionAmount', { ...config.transactionAmount, max: parseFloat(value) })}
                          >
                            <NumberInputField placeholder="Max" />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        </Grid>
                      </Box>

                      <Box>
                        <Text mb={1}>Task Interval (seconds)</Text>
                        <NumberInput
                          value={config.taskInterval}
                          min={1}
                          max={3600}
                          onChange={(value) => updateConfig('taskInterval', parseInt(value))}
                        >
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      </Box>

                      <Box>
                        <Text mb={2}>Wallet Execution Order</Text>
                        <RadioGroup
                          value={config.walletExecutionOrder}
                          onChange={(value) => updateConfig('walletExecutionOrder', value)}
                        >
                          <HStack spacing={4}>
                            <Radio value="Sequential">Sequential</Radio>
                            <Radio value="Random">Random</Radio>
                          </HStack>
                        </RadioGroup>
                      </Box>

                      <Box>
                        <Text mb={1}>Jito MEV Tip</Text>
                        <NumberInput
                          value={config.jitoMevTip}
                          min={0.001}
                          max={1}
                          step={0.001}
                          onChange={(value) => updateConfig('jitoMevTip', parseFloat(value))}
                        >
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      </Box>

                      <Box mb={4}>
                        <Text mb={2}>Select Proxy (Optional)</Text>
                        <Select
                          placeholder="Select proxy"
                          value={selectedProxy}
                          onChange={(e) => setSelectedProxy(e.target.value)}
                        >
                          {availableProxies.map((proxy, index) => (
                            <option key={index} value={proxy}>
                              {proxy}
                            </option>
                          ))}
                        </Select>
                      </Box>
                    </VStack>
                  </CardBody>
                </Card>
              </GridItem>
            </Grid>
          </VStack>
        </CardBody>
      </Card>
      <GenerateWalletsModal />
    </Box>
  );
} 