import { Box, Button, Text } from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { Event } from "../components/event";
import { useEffect, useState } from "react";
import { MAX_EVENTS } from "../defaults";
import { User } from "./user";

export function Events(props?: { userComponent?: typeof User }) {
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
              eventRelayUrls={event.eventRelayUrls}
              key={event.event.id}
              userComponent={
                props && props.userComponent ? (
                  event.user ? (
                    <props.userComponent user={event.user} />
                  ) : (
                    <props.userComponent
                      user={{
                        pubkey: event.event.pubkey,
                      }}
                    />
                  )
                ) : undefined
              }
            />
          </Box>
        );
      })}
      {eventsCount === 0 && <Text>Waiting for fresh content ... hold on.</Text>}
      {eventsCount >= maxEvents && (
        <Box display="flex" justifyContent="space-between" padding={2}>
          <Button flex="1" marginRight={2} onClick={moreEvents}>
            Load 50 more
          </Button>
          <Button
            flex="1"
            marginLeft={2}
            onClick={() => useNClient.getState().clearEvents()}
          >
            Reset and load new (performance)
          </Button>
        </Box>
      )}
    </Box>
  );
}
