import { Box, HStack, Text } from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { useEffect, useState } from "react";

export function BottomBar() {
  const [connected] = useNClient((state) => [state.connected]);
  const [relayCount, setRelayCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [events] = useNClient((state) => [state.events]);
  const [maxEvents] = useNClient((state) => [state.maxEvents]);

  useEffect(() => {
    const statsUpdateInterval = setInterval(async () => {
      const now = Date.now();

      if (now - lastUpdate > 5000) {
        setLastUpdate(now);
        const count = await useNClient.getState().countUsers();
        if (count) {
          setUserCount(count);
        }
        const relays = await useNClient.getState().relays();
        if (relays) {
          setRelayCount(relays.length);
        }
      }
    }, 1000);

    return () => clearInterval(statsUpdateInterval);
  }, []);

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
            <HStack spacing={2}>
              <Text fontSize="sm">Relays:</Text>
              <Text fontSize="xl">{relayCount}</Text>
            </HStack>
          </>
        )}
      </HStack>
    </Box>
  );
}
