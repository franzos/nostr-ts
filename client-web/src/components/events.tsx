import { Box, Button, Text } from "@chakra-ui/react";
import { NFilters } from "@nostr-ts/common";
import { useNClient } from "../state/client";
import { Event } from "../components/event";
import { useEffect, useState } from "react";
import { EVENTS_PER_PAGE, MAX_EVENTS } from "../defaults";
import { User } from "./user";

const firstPage = 1;

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

  const [currentPage, setCurrentPage] = useState(firstPage);
  const [totalPages, setTotalPages] = useState(1);

  const calculateTotalPages = async () => {
    const totalEvents = await useNClient.getState().countEvents();
    console.log("totalEvents", totalEvents);
    setTotalPages(Math.ceil(totalEvents / EVENTS_PER_PAGE));
  };

  const loadEvents = async () => {
    const eventsCount = await useNClient.getState().events.length;
    const expected = currentPage * EVENTS_PER_PAGE;
    if (eventsCount < expected) {
      console.log("loadEvents", eventsCount, expected);
      await useNClient.getState().getEvents({
        limit: EVENTS_PER_PAGE,
        offset: eventsCount,
      });
    }
  };

  useEffect(() => {
    loadEvents();
    const timeout = setTimeout(() => {
      setShowButtonsAnyway(true);
    }, 5000);
    const totalPageCountInterval = setInterval(async () => {
      await calculateTotalPages();
    }, 2000);
    const loadEventsInterval = setInterval(async () => {
      await loadEvents();
    }, 1000);
    return () => {
      clearTimeout(timeout);
      clearInterval(totalPageCountInterval);
      clearInterval(loadEventsInterval);
    };
  }, []);

  useEffect(() => {
    const expected = currentPage * EVENTS_PER_PAGE;
    if (events.length < expected) {
      // useNClient.getState().setStreamEvents(false);
    }
  }, [events]);

  const nextPage = async () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      await useNClient.getState().getEvents({
        limit: EVENTS_PER_PAGE,
        offset: currentPage * EVENTS_PER_PAGE,
      });
    }
  };

  const moreEvents = async () => {
    if (moreEventsCount === 0) {
      setMoreEventsCount(moreEventsCount + 1);
    }
    if (currentPage < totalPages) {
      console.log("nextPage");
      await nextPage();
      return;
    }
    if (events.length >= maxEvents) {
      await useNClient.getState().setMaxEvents(maxEvents + MAX_EVENTS);
    }
    if (props) {
      await useNClient.getState().setViewSubscription(props.view, filters);
    }
  };

  const newEvents = async () => {
    setMoreEventsCount(0);
    setFilters(props.filters);
    await useNClient.getState().setViewSubscription(props.view, filters, {
      reset: true,
    });
    setShowButtonsAnyway(false);
  };

  const showButtons = events.length >= maxEvents || showButtonsAnyway;

  return (
    <Box style={{ overflowWrap: "break-word", wordWrap: "break-word" }}>
      {events.map((event, index) => {
        return (
          <Box padding={2} key={`${event.event.id}-${index}`}>
            <Event
              event={event.event}
              user={event.user}
              reactions={event.reactions}
              reposts={event.reposts}
              mentions={event.mentions}
              replies={event.replies}
              eventRelayUrls={event.eventRelayUrls}
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
              level={0}
            />
          </Box>
        );
      })}
      {events.length === 0 && (
        <Box marginTop={5} marginBottom={5} textAlign={"center"}>
          <Text>Waiting for fresh content ... hold on.</Text>
        </Box>
      )}
      {showButtons && (
        <Box display="flex" justifyContent="space-between" padding={2}>
          <Button flex="1" marginRight={2} onClick={moreEvents}>
            Load more
          </Button>
          <Button flex="1" marginLeft={2} onClick={newEvents}>
            Clear and load new
          </Button>
        </Box>
      )}
    </Box>
  );
}
