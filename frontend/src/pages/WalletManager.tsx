import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Grid,
  Alert,
  AlertIcon,
  AlertDescription,
  Tag,
  useToast,
  VStack,
  Text,
  Spinner,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  RadioGroup,
  Radio,
  Stack,
  Input,
  FormControl,
  FormLabel,
  Tooltip,
  useClipboard,
  Flex,
} from '@chakra-ui/react';
import { FaWallet, FaCoins, FaExchangeAlt, FaDownload, FaPlus, FaTrash, FaCopy } from 'react-icons/fa';
import axios from 'axios';

interface WalletDetails {
  type: 'DEV' | 'FUNDING' | 'MICRO_TRADE' | 'VOLUME_BOT';
  address: string;
  privateKey?: string;
  solBalance: number;
  tokenBalances: Array<{ symbol: string; amount: number }>;
}

const API_URL = 'http://localhost:4000/api';

type WalletType = 'DEV' | 'FUNDING' | 'MICRO_TRADE' | 'VOLUME_BOT';

export default function WalletManager() {
  const toast = useToast();
  const [wallets, setWallets] = useState<WalletDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [walletType, setWalletType] = useState<'DEV' | 'FUNDING' | 'MICRO_TRADE' | 'VOLUME_BOT'>('FUNDING');
  const [privateKey, setPrivateKey] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<WalletDetails | null>(null);
  const { onCopy: onCopyAddress, hasCopied: hasCopiedAddress } = useClipboard("");
  const { onCopy: onCopyPrivateKey, hasCopied: hasCopiedPrivateKey } = useClipboard("");
  const { isOpen: isDetailsOpen, onOpen: onDetailsOpen, onClose: onDetailsClose } = useDisclosure();

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('http://localhost:4000/api/wallets');
      setWallets(response.data);
    } catch (error) {
      toast({
        title: "Error fetching wallets",
        description: error instanceof Error ? error.message : "Failed to load wallets",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWallet = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API_URL}/wallets/create`, {
        type: walletType
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data) {
        toast({
          title: "Wallet Created",
          description: `New ${walletType} wallet created successfully`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        await fetchWallets();
      }
      onClose();
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } };
      toast({
        title: "Error creating wallet",
        description: error.response?.data?.error || "Network error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportWallet = async () => {
    try {
      await axios.post('http://localhost:4000/api/wallets/import', {
        privateKey,
        type: walletType
      });
      toast({
        title: "Wallet Imported",
        description: `${walletType} wallet imported successfully`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      setPrivateKey('');
      fetchWallets();
      onClose();
    } catch (error) {
      toast({
        title: "Error importing wallet",
        description: error instanceof Error ? error.message : "Failed to import wallet",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleRemoveWallet = async (address: string) => {
    try {
      setIsLoading(true);
      await axios.delete(`${API_URL}/wallets/${address}`);
      toast({
        title: "Wallet Removed",
        description: "Wallet removed successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      await fetchWallets();
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } };
      toast({
        title: "Error removing wallet",
        description: error.response?.data?.error || "Failed to remove wallet",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConsolidateSOL = async () => {
    try {
      await axios.post('http://localhost:4000/api/wallets/consolidate');
      toast({
        title: "Consolidating SOL",
        description: "Moving all SOL to dev wallet...",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
      // Refresh wallet list after consolidation
      await fetchWallets();
    } catch (error) {
      toast({
        title: "Error consolidating SOL",
        description: error instanceof Error ? error.message : "Failed to consolidate SOL",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleSellAllPositions = async () => {
    try {
      await axios.post('http://localhost:4000/api/wallets/sell-all');
      toast({
        title: "Selling All Positions",
        description: "Initiating sale of all tokens...",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
      // Refresh wallet list after selling
      await fetchWallets();
    } catch (error) {
      toast({
        title: "Error selling positions",
        description: error instanceof Error ? error.message : "Failed to sell positions",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleExportWallets = () => {
    try {
      const walletsData = JSON.stringify(wallets, null, 2);
      const blob = new Blob([walletsData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wallet-info.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: "Wallet information has been exported to wallet-info.json",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error exporting wallets",
        description: error instanceof Error ? error.message : "Failed to export wallets",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleViewDetails = (wallet: WalletDetails) => {
    setSelectedWallet(wallet);
    onDetailsOpen();
  };

  const WalletDetailsModal = () => {
    if (!selectedWallet) return null;

    return (
      <Modal isOpen={isDetailsOpen} onClose={onDetailsClose} size="lg">
        <ModalOverlay />
        <ModalContent bg="gray.800">
          <ModalHeader>Wallet Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Box>
                <Text fontWeight="bold" mb={2}>Type:</Text>
                <Tag colorScheme={selectedWallet.type === 'DEV' ? 'purple' : 'blue'}>
                  {selectedWallet.type}
                </Tag>
              </Box>

              <Box>
                <Text fontWeight="bold" mb={2}>Address:</Text>
                <Flex align="center" bg="gray.700" p={2} borderRadius="md">
                  <Text isTruncated>{selectedWallet.address}</Text>
                  <Button
                    ml={2}
                    size="sm"
                    onClick={() => onCopyAddress(selectedWallet.address)}
                    colorScheme={hasCopiedAddress ? "green" : "blue"}
                  >
                    <FaCopy />
                  </Button>
                </Flex>
              </Box>

              {selectedWallet.privateKey && (
                <Box>
                  <Text fontWeight="bold" mb={2}>Private Key:</Text>
                  <Flex align="center" bg="gray.700" p={2} borderRadius="md">
                    <Text
                      isTruncated
                      sx={{
                        filter: "blur(4px)",
                        _hover: { filter: "blur(0)" },
                        transition: "filter 0.2s",
                        cursor: "pointer"
                      }}
                    >
                      {selectedWallet.privateKey}
                    </Text>
                    <Button
                      ml={2}
                      size="sm"
                      onClick={() => onCopyPrivateKey(selectedWallet.privateKey!)}
                      colorScheme={hasCopiedPrivateKey ? "green" : "blue"}
                    >
                      <FaCopy />
                    </Button>
                  </Flex>
                </Box>
              )}

              <Box>
                <Text fontWeight="bold" mb={2}>SOL Balance:</Text>
                <Text>{selectedWallet.solBalance} SOL</Text>
              </Box>

              {selectedWallet.tokenBalances.length > 0 && (
                <Box>
                  <Text fontWeight="bold" mb={2}>Token Balances:</Text>
                  <Table size="sm" variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Token</Th>
                        <Th isNumeric>Amount</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {selectedWallet.tokenBalances.map((token, idx) => (
                        <Tr key={idx}>
                          <Td>{token.symbol}</Td>
                          <Td isNumeric>{token.amount}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onDetailsClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  };

  return (
    <Card bg="gray.800" mx="4" my="4">
      <CardHeader>
        <Heading size="md">Wallet Management</Heading>
      </CardHeader>
      <CardBody>
        <Grid templateColumns="repeat(4, 1fr)" gap={4} mb={6}>
          <Button
            leftIcon={<FaCoins />}
            colorScheme="purple"
            variant="outline"
            onClick={handleConsolidateSOL}
            isDisabled={isLoading || wallets.length === 0}
          >
            Consolidate SOL
          </Button>
          <Button
            leftIcon={<FaExchangeAlt />}
            colorScheme="purple"
            variant="outline"
            onClick={handleSellAllPositions}
            isDisabled={isLoading || wallets.length === 0}
          >
            Sell All Positions
          </Button>
          <Button
            leftIcon={<FaDownload />}
            colorScheme="purple"
            variant="outline"
            onClick={handleExportWallets}
            isDisabled={isLoading || wallets.length === 0}
          >
            Export Wallet Info
          </Button>
          <Button
            leftIcon={<FaPlus />}
            colorScheme="green"
            onClick={onOpen}
          >
            Add Wallet
          </Button>
        </Grid>

        <Alert status="info" mb={6} bg="gray.700">
          <AlertIcon />
          <AlertDescription>
            Showing all dev and funding wallets with their current balances
          </AlertDescription>
        </Alert>

        {/* Add Wallet Modal */}
        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent bg="gray.800">
            <ModalHeader>Add New Wallet</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel>Wallet Type</FormLabel>
                  <RadioGroup value={walletType} onChange={(value: WalletType) => setWalletType(value)}>
                    <Stack direction="column" spacing={2}>
                      <Radio value="DEV">Dev Wallet</Radio>
                      <Radio value="FUNDING">Funding Wallet</Radio>
                      <Radio value="MICRO_TRADE">Micro Trade Wallet</Radio>
                      <Radio value="VOLUME_BOT">Volume Bot Wallet</Radio>
                    </Stack>
                  </RadioGroup>
                </FormControl>

                <FormControl>
                  <FormLabel>Import Existing Wallet</FormLabel>
                  <Input
                    placeholder="Enter private key (optional)"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                  />
                </FormControl>
              </VStack>
            </ModalBody>

            <ModalFooter>
              <Button colorScheme="gray" mr={3} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="purple" mr={3} onClick={handleImportWallet} isDisabled={!privateKey}>
                Import
              </Button>
              <Button colorScheme="green" onClick={handleCreateWallet}>
                Create New
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        <Box overflowX="auto" maxH="400px" borderRadius="md" borderWidth="1px" borderColor="gray.700">
          {isLoading ? (
            <VStack p={8}>
              <Spinner size="xl" color="purple.500" />
              <Text>Loading wallets...</Text>
            </VStack>
          ) : wallets.length === 0 ? (
            <VStack p={8}>
              <Text color="gray.400">No wallets found. Create or import wallets to get started.</Text>
            </VStack>
          ) : (
            <Table variant="simple">
              <Thead bg="gray.700">
                <Tr>
                  <Th color="gray.200">Type</Th>
                  <Th color="gray.200">Address</Th>
                  <Th color="gray.200">SOL Balance</Th>
                  <Th color="gray.200">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {wallets.map((wallet, index) => (
                  <Tr key={index}>
                    <Td>
                      <Tag colorScheme={wallet.type === 'DEV' ? 'purple' : 'blue'}>
                        {wallet.type}
                      </Tag>
                    </Td>
                    <Td fontFamily="mono" isTruncated maxW="200px">
                      {wallet.address}
                    </Td>
                    <Td>{wallet.solBalance} SOL</Td>
                    <Td>
                      <Flex gap={2}>
                        <Button
                          size="sm"
                          colorScheme="blue"
                          onClick={() => handleViewDetails(wallet)}
                        >
                          Details
                        </Button>
                        <Button
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => handleRemoveWallet(wallet.address)}
                        >
                          <FaTrash />
                        </Button>
                      </Flex>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>

        <WalletDetailsModal />
      </CardBody>
    </Card>
  );
} 