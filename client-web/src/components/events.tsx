import { Box } from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { Event } from "../components/event";
import { useEffect } from "react";

export function Events() {
  const [events] = useNClient((state) => [state.events]);

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

  return (
    <Box maxHeight="80vh" overflowY="auto">
      {events.map((event) => {
        return (
          <Box padding={2} key={event.event.id}>
            <Event event={event.event} user={event.user} key={event.event.id} />
          </Box>
        );
      })}
    </Box>
  );
}
