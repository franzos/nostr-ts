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
} from "@chakra-ui/react";
import "./App.css";
import { useNClient } from "./state/client";
import { Event } from "./components/event";
import { UserFollowing } from "./components/user-header";
import { useEffect, useState } from "react";
import { ClientSubscription, NUserBase } from "@nostr-ts/common";

function App() {
  const [relayCount, setRelayCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [subscriptions, setSubscriptions] = useState<ClientSubscription[]>([]);
  const [connected] = useNClient((state) => [state.connected]);
  const [events] = useNClient((state) => [state.events]);
  const [followingUsers, setFollowingUsers] = useState<NUserBase[]>([]);

  const { isOpen, onOpen, onClose } = useDisclosure();

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

  const FilterModal = (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
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
              onOpen();
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

  return (
    <Container maxW="8xl" p={5}>
      <VStack spacing={5} align="stretch">
        <VStack spacing={1} align="start">
          <Heading as="h1" size="lg">
            Nostr Client
          </Heading>
          <Text fontSize="xl" color="gray.500">
            Got {events.length} event(s) and {userCount} users from{" "}
            {subscriptions.length} subscription(s) on {relayCount} relay(s).
          </Text>
        </VStack>

        <Grid templateColumns={["1fr", "1fr 2fr"]} gap={5}>
          <VStack align="start" spacing={5}>
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

              {FilterModal}

              <Heading as="h2" size="md">
                Following Users
              </Heading>
              <Box>
                {followingUsers.length > 0 ? (
                  <>
                    {followingUsers.map((user) => (
                      <Box key={user.pubkey}>
                        {UserFollowing({ user: user })}
                      </Box>
                    ))}
                  </>
                ) : (
                  <Text>No users being followed.</Text>
                )}
              </Box>
            </Box>

            <Box>
              <HStack>
                {connected ? (
                  <Button onClick={useNClient.getState().disconnect}>
                    Disconnect
                  </Button>
                ) : (
                  <Button onClick={useNClient.getState().connect}>
                    Connect
                  </Button>
                )}
              </HStack>
            </Box>
          </VStack>

          <Box
            maxHeight="80vh"
            overflowY="auto"
            style={{
              background: "rgba(0,0,0,0.1)",
            }}
          >
            {events.map((event, index) => {
              if (events.length === index + 1) {
                return (
                  <Event
                    event={event.event}
                    user={event.user}
                    key={event.event.id}
                  />
                );
              } else {
                return (
                  <Event
                    event={event.event}
                    user={event.user}
                    key={event.event.id}
                  />
                );
              }
            })}
          </Box>
        </Grid>
      </VStack>
    </Container>
  );
}

export default App;
