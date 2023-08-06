import { useRef, useState } from "react";
import { RelayClient } from "@nostr-ts/web";
import { ClientSubscription, NFilters } from "@nostr-ts/common";
import {
  Container,
  Button,
  Heading,
  Stack,
  Text,
  TableContainer,
  TableCaption,
  Thead,
  Tr,
  Th,
  Table,
  Tbody,
  Td,
  Flex,
} from "@chakra-ui/react";
import "./App.css";
import { useNClient } from "./state/client";
import { Event } from "./components/event";

function App() {
  const [relayCount, setRelayCount] = useState(0);
  const [subscriptions, setSubscriptions] = useState<ClientSubscription[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const rlClient = useRef<RelayClient>();

  const connect = () => {
    rlClient.current = new RelayClient(["wss://nos.lol"]);

    rlClient.current.subscribe({
      filters: new NFilters({
        limit: 10,
        kinds: [1],
      }),
    });

    setIsConnected(true);

    rlClient.current.listen(async (payload) => {
      console.log(`Event ${payload.meta.id} on ${payload.meta.url}.`);
      useNClient.getState().addEvent(payload);
    });

    setRelayCount(rlClient.current.relays.length);
    setSubscriptions(rlClient.current.getSubscriptions());

    rlClient.current.getRelayInformation();
  };

  const disconnect = async () => {
    rlClient.current?.disconnect();
    setIsConnected(false);
    setRelayCount(0);
    setSubscriptions([]);
    useNClient.getState().clearEvents();
  };

  const unsubscribe = async (id: string) => {
    rlClient.current?.unsubscribe(id);
    setSubscriptions(rlClient.current?.getSubscriptions());
  };

  const [events] = useNClient((state) => [state.events]);

  return (
    <Flex
      width={"100vw"}
      height={"100vh"}
      alignContent={"center"}
      justifyContent={"center"}
    >
      <Container maxW="2xl" centerContent>
        <Heading as="h1" size="lg">
          Nostr Client
        </Heading>
        <Text fontSize="xl" color="gray.500">
          Got {events.length} event(s) from {subscriptions.length}{" "}
          subscription(s) on {relayCount} relay(s).
        </Text>
        <TableContainer>
          <Table variant="simple">
            <TableCaption>
              Subscription to stuff you care about ...
            </TableCaption>
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
                  <Tr>
                    <Td>{sub.url}</Td>
                    <Td>{JSON.stringify(sub.filters)}</Td>
                    <Td>
                      <Button onClick={() => unsubscribe(sub.subscriptionId)}>
                        Unsubscribe
                      </Button>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </TableContainer>
        <div className="card">
          <Stack spacing={4} direction="row">
            {isConnected ? (
              <Button onClick={disconnect}>Disconnect</Button>
            ) : (
              <Button onClick={connect}>Connect</Button>
            )}
          </Stack>
        </div>
        {events.map((event) => {
          return <Event event={event} key={event.id} />;
        })}
      </Container>
    </Flex>
  );
}

export default App;
