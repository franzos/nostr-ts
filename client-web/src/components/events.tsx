import { Box, Button, Text } from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { Event } from "../components/event";
import { useEffect, useState } from "react";
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
  const [showButtonsAnyway, setShowButtonsAnyway] = useState(false);

  const [filters, setFilters] = useState<NFilters>(props.filters);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowButtonsAnyway(true);
    }, 5000);
    return () => {
      clearTimeout(timeout);
    };
  }, []);

  const moreEvents = async () => {
    if (moreEventsCount === 0) {
      setMoreEventsCount(moreEventsCount + 1);
    }
    await useNClient.getState().setMaxEvents(maxEvents + MAX_EVENTS);
    if (props) {
      await useNClient.getState().setViewSubscription(props.view, filters);
    }
  };

  const newEvents = async () => {
    setMoreEventsCount(0);
    setFilters(props.filters);
    await useNClient.getState().setMaxEvents(MAX_EVENTS);
    await useNClient.getState().clearEvents();
    await useNClient.getState().setViewSubscription(props.view, filters);
    setShowButtonsAnyway(false);
  };

  const showButtons = events.length >= maxEvents || showButtonsAnyway;

  return (
    <Box style={{ overflowWrap: "break-word", wordWrap: "break-word" }}>
      {events.map((event) => {
        return (
          <Box padding={2} key={event.event.id}>
            <Event
              event={event.event}
              user={event.user}
              reactions={event.reactions}
              reposts={event.reposts}
              mentions={event.mentions}
              replies={event.replies}
              eventRelayUrls={event.eventRelayUrls}
              key={event.event.id}
              userComponent={
                props && props.userComponent ? (
                  event.user && event.user.pubkey ? (
                    <props.userComponent
                      user={event.user}
                      options={{
                        showFollowing: true,
                        relayUrls: event.eventRelayUrls,
                      }}
                    />
                  ) : (
                    <props.userComponent
                      user={{
                        pubkey: event.event.pubkey,
                      }}
                      options={{
                        relayUrls: event.eventRelayUrls,
                      }}
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
      {showButtons && (
        <Box display="flex" justifyContent="space-between" padding={2}>
          <Button flex="1" marginRight={2} onClick={moreEvents}>
            Load {MAX_EVENTS} more
          </Button>
          <Button flex="1" marginLeft={2} onClick={newEvents}>
            Reset and load new (performance)
          </Button>
        </Box>
      )}
    </Box>
  );
}
