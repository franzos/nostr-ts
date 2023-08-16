import { Box, Button } from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { Event } from "../components/event";
import { useEffect, useState } from "react";
import { MAX_EVENTS } from "../defaults";

export function Events() {
  const [events] = useNClient((state) => [state.events]);
  const [eventsCount] = useNClient((state) => [state.events.length]);
  const [maxEvents] = useNClient((state) => [state.maxEvents]);

  const [moreEventsCount, setMoreEventsCount] = useState(0);

  useEffect(() => {
    const userFetchInterval = setInterval(async () => {
      if (events.length === 0) {
        return;
      }
      const eventUserPubkeys = events
        .filter((e) => !e.user?.pubkey)
        .map((e) => e.event.pubkey);

      useNClient.getState().getUserInformation(eventUserPubkeys);

      const eventIds = events
        .filter((e) => !e.reactions)
        .map((e) => e.event.id);

      useNClient.getState().getEventInformation(eventIds);
    }, 10000);

    return () => {
      clearInterval(userFetchInterval);
      useNClient.getState().setMaxEvents(MAX_EVENTS);
    };
  }, []);

  const moreEvents = () => {
    if (moreEventsCount === 0) {
      setMoreEventsCount(moreEventsCount + 1);
    }
    useNClient.getState().setMaxEvents(maxEvents + 50);
  };

  return (
    <Box maxHeight="80vh" overflowY="auto">
      {events.map((event) => {
        return (
          <Box padding={2} key={event.event.id}>
            <Event
              event={event.event}
              user={event.user}
              reactions={event.reactions}
              reposts={event.reposts}
              key={event.event.id}
            />
          </Box>
        );
      })}
      {eventsCount >= maxEvents && (
        <Box padding={2}>
          <Button onClick={moreEvents} width="100%">
            Load more events
          </Button>
        </Box>
      )}
    </Box>
  );
}
