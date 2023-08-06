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
} from "@chakra-ui/react";
import "./App.css";
import { useNClient } from "./state/client";
import { Event } from "./components/event";
import { UserFollowing } from "./components/user-header";

function App() {
  const [relayCount] = useNClient((state) => [state.relayCount]);
  const [userCount] = useNClient((state) => [state.userCount]);
  const [subscriptions] = useNClient((state) => [state.subscriptions]);
  const [connected] = useNClient((state) => [state.connected]);
  const [events] = useNClient((state) => [state.events]);
  const [followingUsers] = useNClient((state) => [state.followingUsers]);

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
                    return (
                      <Tr key={`${sub.connectionId}-${sub.subscriptionId}`}>
                        <Td>{sub.url}</Td>
                        <Td>{JSON.stringify(sub.filters)}</Td>
                        <Td>
                          <Button
                            onClick={() =>
                              useNClient
                                .getState()
                                .unsubscribe(sub.subscriptionId)
                            }
                          >
                            Unsubscribe
                          </Button>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
              <Heading as="h2" size="md">
                Following Users
              </Heading>
              <Box>
                {followingUsers.length > 0 ? (
                  followingUsers.map((user) => {
                    return UserFollowing({ user: user });
                  })
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
