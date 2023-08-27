import { Box, HStack, Text, useToast } from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { useEffect, useState } from "react";
import { RELAY_MESSAGE_TYPE } from "@nostr-ts/common";
import { excerpt } from "../lib/excerpt";

export function BottomBar() {
  const [userCount, setUserCount] = useState(0);
  const [eventsCount, maxEvents, relayEvents] = useNClient((state) => [
    state.events.length,
    state.maxEvents,
    state.relayEvents,
  ]);
  const [lastCount, setLastCount] = useState(0);

  const toast = useToast();

  const update = async () => {
    const count = await useNClient.getState().countUsers();
    if (count) {
      setUserCount(count);
    }
  };

  useEffect(() => {
    const statsUpdateInterval = setInterval(update, 1000);

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
        for (const event of newEvents) {
          let description = "";
          let success = true;
          if (event.data[0] === RELAY_MESSAGE_TYPE.NOTICE) {
            description = event.data[1];
          } else if (event.data[0] === RELAY_MESSAGE_TYPE.OK) {
            description = `Event ${excerpt(event.data[1], 5)}: ${
              event.data[3]
            }`;
            success = event.data[2];
          } else if (event.data[0] === RELAY_MESSAGE_TYPE.EOSE) {
            // Ignore for now
            return;
            // description = `Loaded all requested events for subscription ${event.data[1]}`;
          } else if (event.data[0] === RELAY_MESSAGE_TYPE.COUNT) {
            description = `Relay ${event.data[1]}: ${JSON.stringify(
              event.data[2]
            )} events`;
          }
          if (description !== "") {
            toast({
              title: `Relay ${event.data[0]}`,
              position: "top-right",
              description,
              status: success ? "info" : "error",
              duration: 5000,
              isClosable: true,
            });
          }
        }
      }
    }
  }, [relayEvents]);

  return (
    <Box position="fixed" bottom={0} left={0} right={0} p={3}>
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
