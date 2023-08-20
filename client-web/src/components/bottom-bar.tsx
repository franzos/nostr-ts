import { Box, HStack, Text, useToast } from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { useEffect, useState } from "react";
import { RELAY_MESSAGE_TYPE } from "@nostr-ts/common";

export function BottomBar() {
  const [connected] = useNClient((state) => [state.connected]);
  const [userCount, setUserCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [events] = useNClient((state) => [state.events]);
  const [maxEvents] = useNClient((state) => [state.maxEvents]);
  const [relayEvents] = useNClient((state) => [state.relayEvents]);
  const [lastCount, setLastCount] = useState(0);

  const toast = useToast();

  useEffect(() => {
    const statsUpdateInterval = setInterval(async () => {
      const now = Date.now();

      if (now - lastUpdate > 5000) {
        setLastUpdate(now);
        const count = await useNClient.getState().countUsers();
        if (count) {
          setUserCount(count);
        }
      }
    }, 1000);

    return () => clearInterval(statsUpdateInterval);
  }, []);

  useEffect(() => {
    const current = relayEvents.length;
    if (current > 0) {
      console.log(`current: ${current}, lastCount: ${lastCount}`);
      console.log(relayEvents);
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
            description = `OK?: ${event.data[2]}. Event ${event.data[1]}: ${event.data[3]}`;
          } else if (event.data[0] === RELAY_MESSAGE_TYPE.EOSE) {
            description = `Eose: ${event.data[1]}`;
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
        {connected && (
          <>
            <HStack spacing={2}>
              <Text fontSize="sm">Events:</Text>
              <Text fontSize="xl" marginLeft={1}>
                {events.length} (max {maxEvents})
              </Text>
            </HStack>
            <HStack spacing={2}>
              <Text fontSize="sm">Users:</Text>
              <Text fontSize="xl">{userCount}</Text>
            </HStack>
          </>
        )}
      </HStack>
    </Box>
  );
}
