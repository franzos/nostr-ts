import { Box, HStack, Text, useToast } from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { useEffect, useState } from "react";
import { RELAY_MESSAGE_TYPE } from "@nostr-ts/common";

export function BottomBar() {
  const [userCount, setUserCount] = useState(0);
  const [eventsCount, maxEvents, relayEvents] = useNClient((state) => [
    state.events.length,
    state.maxEvents,
    state.relayEvents,
  ]);
  const [lastCount, setLastCount] = useState(0);

  const toast = useToast();

  useEffect(() => {
    const statsUpdateInterval = setInterval(async () => {
      const count = await useNClient.getState().countUsers();
      if (count) {
        setUserCount(count);
      }
    }, 1000);

    return () => clearInterval(statsUpdateInterval);
  }, []);

  /**
   * Relay events
   */
  useEffect(() => {
    const current = relayEvents.length;
    if (current > 0) {
      const diff = current - lastCount;
      if (diff > 0) {
        setLastCount(current);
        const newEvents = relayEvents.slice(-diff);
        console.log(newEvents);
        for (const event of newEvents) {
          let description = "";
          if (event.data[0] === RELAY_MESSAGE_TYPE.NOTICE) {
            description = event.data[1];
          } else if (event.data[0] === RELAY_MESSAGE_TYPE.OK) {
            description = `${event.data[2]}. Event ${event.data[1]}: ${event.data[3]}`;
          } else if (event.data[0] === RELAY_MESSAGE_TYPE.EOSE) {
            description = `${event.data[1]}`;
          } else if (event.data[0] === RELAY_MESSAGE_TYPE.COUNT) {
            description = `Relay ${event.data[1]}: ${JSON.stringify(
              event.data[2]
            )} events`;
          }
          console.log(description);
          if (description !== "") {
            toast({
              title: `Relay ${event.data[0]}`,
              position: "top-right",
              description,
              status: "info",
              duration: 5000,
              isClosable: true,
            });
          }
        }
      }
    }
  }, [relayEvents]);

  return (
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
        <>
          <HStack spacing={2}>
            <Text fontSize="sm">Events:</Text>
            <Text fontSize="xl" marginLeft={1}>
              {eventsCount} (max {maxEvents})
            </Text>
          </HStack>
          <HStack spacing={2}>
            <Text fontSize="sm">Users:</Text>
            <Text fontSize="xl">{userCount}</Text>
          </HStack>
        </>
      </HStack>
    </Box>
  );
}
