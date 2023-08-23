import { Box, Button, Text } from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { Event } from "../components/event";
import { useState } from "react";
import { MAX_EVENTS } from "../defaults";
import { User } from "./user";
import { NFilters } from "@nostr-ts/common";

export function Events(props: {
  userComponent?: typeof User;
  view: string;
  filters: NFilters;
  connected: boolean;
}) {
  const [events, maxEvents] = useNClient((state) => [
    state.events,
    state.maxEvents,
  ]);

  const [moreEventsCount, setMoreEventsCount] = useState(0);

  const moreEvents = async () => {
    if (moreEventsCount === 0) {
      setMoreEventsCount(moreEventsCount + 1);
    }
    await useNClient.getState().setMaxEvents(maxEvents + MAX_EVENTS);
    if (props) {
      await useNClient
        .getState()
        .setViewSubscription(props.view, props.filters);
    }
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
              eventRelayIds={event.eventRelayIds}
              key={event.event.id}
              userComponent={
                props && props.userComponent ? (
                  event.user && event.user.pubkey ? (
                    <props.userComponent
                      user={event.user}
                      relayId={event.eventRelayIds[0]}
                    />
                  ) : (
                    <props.userComponent
                      user={{
                        pubkey: event.event.pubkey,
                      }}
                      relayId={event.eventRelayIds[0]}
                    />
                  )
                ) : undefined
              }
            />
          </Box>
        );
      })}
      {events.length === 0 && (
        <Text>Waiting for fresh content ... hold on.</Text>
      )}
      {events.length >= maxEvents && (
        <Box display="flex" justifyContent="space-between" padding={2}>
          <Button flex="1" marginRight={2} onClick={moreEvents}>
            Load {MAX_EVENTS} more
          </Button>
          <Button
            flex="1"
            marginLeft={2}
            onClick={async () => useNClient.getState().clearEvents()}
          >
            Reset and load new (performance)
          </Button>
        </Box>
      )}
    </Box>
  );
}
