import { useEffect, useRef } from "react";
import { Box, Button } from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { Event } from "../components/event";
import { Virtuoso } from "react-virtuoso";

interface EventsProps {
  view: string;
  changingView?: boolean;
}

export function Events({ view, changingView }: EventsProps) {
  const [events, eventsNewerCount] = useNClient((state) => [
    state.events[view] || [],
    state.eventsNewer[view]?.length || 0,
  ]);
  const throttleTimestamp = useRef(Date.now());
  const linkPreviewProxyUrl =
    localStorage.getItem("linkPreviewProxyUrl") || undefined;

  const loadEvents = async () => {
    if (
      throttleTimestamp.current > Date.now() - 2000 ||
      changingView === true
    ) {
      return;
    }
    throttleTimestamp.current = Date.now();

    const nextQuery = useNClient.getState().nextQuery;
    if (
      nextQuery &&
      nextQuery.next &&
      nextQuery.next.reqCount &&
      nextQuery.next.reqCount > 2 &&
      useNClient.getState().events[view] &&
      useNClient.getState().events[view].length < 10
    ) {
      await useNClient.getState().getEvents(
        {
          token: nextQuery.token,
          query: {
            ...nextQuery.next,
            filters: {
              ...nextQuery.next.filters,
              until: Math.round(Date.now() / 1000),
              since: Math.round(Date.now() / 1000) - 30 * 24 * 60 * 60,
            },
          },
        },
        "replace"
      );
    } else {
      await useNClient.getState().getEvents();
    }
  };

  useEffect(() => {
    if (useNClient.getState().nextQuery) {
      loadEvents();
    }
  }, []);

  const mergeNewerEvents = () => {
    useNClient.getState().mergeNewerEvents(view);
  };

  return (
    <>
      {eventsNewerCount > 0 && (
        <Button
          onClick={mergeNewerEvents}
          variant="outline"
          colorScheme="blue"
          size="sm"
          mb={2}
          width={"100%"}
        >
          {eventsNewerCount} new events
        </Button>
      )}
      <Virtuoso
        useWindowScroll={true}
        data={events}
        itemContent={(index, data) => (
          <Box mb={2}>
            <Event
              key={index}
              data={data}
              level={0}
              linkPreviewProxyUrl={linkPreviewProxyUrl}
            />
          </Box>
        )}
        endReached={() => {
          loadEvents();
        }}
      />
    </>
  );
}
