import {
  Container,
  Button,
  Heading,
  VStack,
  HStack,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box,
  Grid,
  useDisclosure,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  ModalFooter,
  Input,
  Flex,
} from "@chakra-ui/react";
import "./App.css";
import { useNClient } from "./state/client";
import { Event } from "./components/event";
import { UserFollowing } from "./components/user-header";
import { useEffect, useState } from "react";
import {
  ClientSubscription,
  NUserBase,
  generateClientKeys,
} from "@nostr-ts/common";

function App() {
  const [relayCount, setRelayCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [subscriptions, setSubscriptions] = useState<ClientSubscription[]>([]);
  const [connected] = useNClient((state) => [state.connected]);
  const [events] = useNClient((state) => [state.events]);
  const [followingUsers, setFollowingUsers] = useState<NUserBase[]>([]);

  const [initialRelayUrls, setInitialRelayUrls] = useState<string[]>([
    "wss://nos.lol",
  ]);
  const [newRelayUrl, setNewRelayUrl] = useState<string>("");
  const {
    isOpen: isConnectModalOpen,
    onOpen: onConnectModalOpen,
    onClose: onConnectModalClose,
  } = useDisclosure();

  const {
    isOpen: isFilterModalOpen,
    onOpen: onFilterModalOpen,
    onClose: onFilterModalClose,
  } = useDisclosure();

  const [activeScreen, setActiveScreen] = useState<
    "subscriptions" | "account" | "events"
  >("events");

  const [keystore] = useNClient((state) => [state.keystore]);
  const [keypairIsLoaded] = useNClient((state) => [state.keypairIsLoaded]);

  const [selectedFilter, setSelectedFilter] = useState<null | string>(null);

  useEffect(() => {
    const statsUpdateInterval = setInterval(async () => {
      const now = Date.now();

      if (now - lastUpdate > 5000) {
        setLastUpdate(now);
        const count = await useNClient.getState().countUsers();
        if (count) {
          setUserCount(count);
        }
        const subs = useNClient.getState().client?.getSubscriptions();
        if (subs) {
          setSubscriptions(subs);
        }
        const relays = useNClient.getState().client?.relays.length;
        if (relays) {
          setRelayCount(relays);
        }
        const following = await useNClient.getState().getAllUsersFollowing();
        if (following) {
          setFollowingUsers(following);
        }
      }
    }, 1000);

    return () => clearInterval(statsUpdateInterval);
  }, []);

  useEffect(() => {
    const userFetchInterval = setInterval(async () => {
      if (events.length === 0) {
        return;
      }
      const eventUserPubkeys = events
        .filter((e) => !e.user?.pubkey)
        .map((e) => e.event.pubkey);

      await useNClient.getState().getUserInformation(eventUserPubkeys);
    }, 10000);

    return () => clearInterval(userFetchInterval);
  }, []);

  const generateKeypair = async () => {
    const keypair = generateClientKeys();
    useNClient.getState().setKeyStore({
      keystore: "localstore",
      publicKey: keypair.publicKey,
      privateKey: keypair.privateKey,
    });
    useNClient.getState();
  };

  const FilterModal = (
    <Modal isOpen={isFilterModalOpen} onClose={onFilterModalClose} size="xl">
      {" "}
      <ModalOverlay />
      <ModalContent maxHeight="80vh" maxWidth="80vw">
        {" "}
        <ModalHeader>Filters</ModalHeader>
        <ModalCloseButton />
        <ModalBody overflowY="auto">
          {" "}
          <pre>{selectedFilter}</pre>
        </ModalBody>
      </ModalContent>
    </Modal>
  );

  const Subscription = (sub: ClientSubscription) => {
    return (
      <Tr key={`${sub.connectionId}-${sub.subscriptionId}`}>
        <Td>{sub.subscriptionId}</Td>
        <Td>
          <Button
            onClick={() => {
              setSelectedFilter(JSON.stringify(sub.filters, null, 2));
              onFilterModalOpen();
            }}
          >
            Show filters
          </Button>
        </Td>
        <Td>
          <Button
            onClick={() =>
              useNClient.getState().unsubscribe(sub.subscriptionId)
            }
          >
            Unsubscribe
          </Button>
        </Td>
      </Tr>
    );
  };

  const Subscriptions = (
    <Box>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>ID</Th>
            <Th>Filter</Th>
            <Th>Action</Th>
          </Tr>
        </Thead>
        <Tbody>
          {subscriptions.map((sub) => {
            return Subscription(sub);
          })}
        </Tbody>
      </Table>
    </Box>
  );

  const Account = (
    <Box>
      <Heading size="md">Account</Heading>
      <Heading size="sm" marginBottom={4}>
        Keystore: {keystore}
      </Heading>
      {keypairIsLoaded ? (
        <Text>Keypair is loaded.</Text>
      ) : (
        <>
          <Text marginBottom={2}>
            Keypair is not loaded. If you generate a new keypair, it will be
            stored in the browser localstore (insecure). Alternate options
            including nos2x support are planned.
          </Text>
          <Button onClick={generateKeypair}>Generate new keypair</Button>
        </>
      )}
    </Box>
  );

  const ConnectModal = (
    <Modal isOpen={isConnectModalOpen} onClose={onConnectModalClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Connect to Relay(s)</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text>
            You can find a list of relays in the nostr-ts repository
            https://github.com/franzos/nostr-ts/blob/master/discovered-relays.json,
            https://nostr.info/relays/ and elsewhere.
          </Text>

          {/* List of Relays */}
          <VStack spacing={3} width="100%">
            {initialRelayUrls.map((url, index) => (
              <Flex
                key={index}
                width="100%"
                alignItems="center"
                borderBottom="1px solid"
                borderColor="gray.200"
                py={2}
              >
                <Text flex="1" marginLeft="2">
                  {url}
                </Text>
                <Button
                  ml="auto"
                  onClick={() => {
                    const newUrls = initialRelayUrls.filter((u) => u !== url);
                    setInitialRelayUrls(newUrls);
                  }}
                >
                  Remove
                </Button>
              </Flex>
            ))}
          </VStack>

          {/* Input for Adding New Relays */}
          <Flex direction="row" alignItems="center">
            <Input
              flex="1"
              value={newRelayUrl}
              onChange={(e) => setNewRelayUrl(e.target.value)}
              placeholder="Enter new relay URL"
            />
            <Button
              ml={2}
              onClick={() => {
                if (newRelayUrl.trim() !== "") {
                  setInitialRelayUrls([...initialRelayUrls, newRelayUrl]);
                  setNewRelayUrl("");
                }
              }}
            >
              Add
            </Button>
          </Flex>
        </ModalBody>
        <ModalFooter>
          <Button
            disabled={initialRelayUrls.length === 0}
            onClick={() => {
              useNClient.getState().connect(initialRelayUrls);
              onConnectModalClose();
            }}
          >
            Connect
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );

  return (
    <Container maxW="8xl" p={5}>
      <VStack spacing={5} align="stretch">
        <VStack spacing={1} align="start">
          <Heading as="h1" size="lg">
            Nostr Client
          </Heading>
        </VStack>

        <Grid templateColumns={["1fr", "1fr 2fr"]} gap={5}>
          <VStack align="start" spacing={5}>
            <Box>
              {FilterModal}
              {ConnectModal}

              <Heading as="h2" size="md">
                Following Users
              </Heading>
              <Box>
                {followingUsers.length > 0 ? (
                  <>
                    {followingUsers.map((user) => (
                      <Box key={user.pubkey} padding={2}>
                        {UserFollowing({ user: user })}
                      </Box>
                    ))}
                  </>
                ) : (
                  <>
                    <Text>
                      Follow users to subscribe to their messages. The
                      subscription is stored in your browser and not shared with
                      relays.
                    </Text>
                    <Text fontWeight="bold">You are not following anyone.</Text>
                  </>
                )}
              </Box>
            </Box>

            <Box p={4}>
              <VStack spacing={4} align="start">
                {connected ? (
                  <Button onClick={useNClient.getState().disconnect}>
                    Disconnect
                  </Button>
                ) : (
                  <Button onClick={onConnectModalOpen}>Connect</Button>
                )}
              </VStack>
            </Box>
          </VStack>

          <Box maxHeight="80vh" overflowY="auto">
            {activeScreen === "subscriptions"
              ? Subscriptions
              : activeScreen === "account"
              ? Account
              : events.map((event, index) => {
                  if (events.length === index + 1) {
                    return (
                      <Box padding={2}>
                        <Event
                          event={event.event}
                          user={event.user}
                          key={event.event.id}
                        />
                      </Box>
                    );
                  } else {
                    return (
                      <Box padding={2}>
                        <Event
                          event={event.event}
                          user={event.user}
                          key={event.event.id}
                        />
                      </Box>
                    );
                  }
                })}
          </Box>
        </Grid>
      </VStack>
      <Box
        position="fixed"
        bottom={0}
        left={0}
        right={0}
        bg="white"
        boxShadow="md"
        p={3}
      >
        <HStack spacing={4}>
          <HStack spacing={2}>
            <Button onClick={() => setActiveScreen("events")}>
              <Text fontSize="sm">Events:</Text>
              <Text fontSize="xl" marginLeft={1}>
                {events.length}
              </Text>
            </Button>
          </HStack>
          <HStack spacing={2}>
            <Text fontSize="sm">Users:</Text>
            <Text fontSize="xl">{userCount}</Text>
          </HStack>
          <HStack spacing={2}>
            <Button onClick={() => setActiveScreen("subscriptions")}>
              <Text fontSize="sm">Subscriptions:</Text>
              <Text fontSize="xl" marginLeft={1}>
                {subscriptions.length}
              </Text>
            </Button>
          </HStack>
          <HStack spacing={2}>
            <Text fontSize="sm">Relays:</Text>
            <Text fontSize="xl">{relayCount}</Text>
          </HStack>
          <HStack spacing={2}>
            <Button onClick={() => setActiveScreen("account")}>
              <Text fontSize="sm">Account</Text>
            </Button>
          </HStack>
        </HStack>
      </Box>
    </Container>
  );
}

export default App;
