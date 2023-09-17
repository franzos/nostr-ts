import React from "react";
import { Box, Button, Progress, Skeleton, Stack, Text } from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { Event } from "../components/event";
import { useEffect, useRef, useState } from "react";

interface EventsProps {
  changingView?: boolean;
}

export function Events({ changingView }: EventsProps) {
  const [events, hasNewerEvents] = useNClient((state) => [
    state.events,
    state.hasNewerEvents,
  ]);

  const loadMoreRef = useRef<HTMLDivElement[]>([]);

  const throttleTimestamp = useRef(Date.now());

  const [isLoading, setIsLoading] = useState(false);
  const [buttonTimeoutPassed, setButtonTimeoutPassed] = useState(false);

  const loadEvents = async () => {
    if (
      throttleTimestamp.current > Date.now() - 2000 ||
      changingView === true
    ) {
      return;
    }
    setIsLoading(true);
    throttleTimestamp.current = Date.now();
    await useNClient.getState().getEvents();
    setIsLoading(false);
  };

  const loadNewerEvents = async () => {
    setIsLoading(true);
    throttleTimestamp.current = Date.now();
    const nextQuery = useNClient.getState().nextQuery;
    if (!nextQuery) return;
    await useNClient.getState().getEvents(
      {
        token: nextQuery.token,
        query: {
          ...nextQuery.next,
          filters: {
            ...nextQuery.next.filters,
            since: Math.round(Date.now() / 1000 - 60 * 60 * 24 * 2),
            until: Math.round(Date.now() / 1000),
          },
        },
      },
      "replace"
    );
    setIsLoading(false);
  };

  useEffect(() => {
    if (useNClient.getState().nextQuery) {
      loadEvents();
    }

    // Activate button after 3s
    const buttonTimeout = setTimeout(() => {
      setButtonTimeoutPassed(true);
    }, 5000);

    return () => {
      // clearTimeout(initialLoad);
      // clearInterval(loadEventsInterval);
      clearTimeout(buttonTimeout);
    };
  }, []);

  useEffect(() => {
    // Intersection Observer logic
    const observer = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting) {
        loadEvents();
      }
    }, {});

    loadMoreRef.current.forEach((ref) => {
      if (ref) {
        observer.observe(ref);
      }
    });

    return () => {
      loadMoreRef.current.forEach((ref) => {
        if (ref) {
          observer.unobserve(ref);
        }
      });
    };
  }, [events.length]); // Depend on `events.length`

  // const showButtons = events.length >= maxEvents || buttonTimeoutPassed;

  const LoadingSkeleton = (
    <Stack>
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton height="160px" mb={2} key={index} />
      ))}
    </Stack>
  );

  const NewerEventsPrompt = (
    <>
      {hasNewerEvents && (
        <Button onClick={loadNewerEvents} width="100%" isLoading={isLoading}>
          There are newer events, click here to load them.
        </Button>
      )}
    </>
  );

  const LoadMoreButton = ({ loadMore }: { loadMore: () => Promise<void> }) => {
    const hasNextQuery = useNClient.getState().nextQuery;
    const until = hasNextQuery ? hasNextQuery?.next?.filters?.until : undefined;
    const since = hasNextQuery ? hasNextQuery?.next?.filters?.since : undefined;

    return (
      <Button flex="1" marginRight={2} onClick={loadMore}>
        Load more {since && `${new Date(since * 1000).toLocaleString()}`}
        {" - "}
        {until && `${new Date(until * 1000).toLocaleString()}`}
      </Button>
    );
  };

  return (
    <Box style={{ overflowWrap: "break-word", wordWrap: "break-word" }}>
      {NewerEventsPrompt}
      {events.map((event, index) => (
        <React.Fragment key={`${event.event.id}-${index}`}>
          <Box mb={2}>
            <Event data={event} level={0} />
          </Box>
          {(index + 1) % 25 === 15 && (
            <div
              ref={(el) => {
                if (el && !loadMoreRef.current.includes(el)) {
                  loadMoreRef.current.push(el);
                }
              }}
            ></div>
          )}
        </React.Fragment>
      ))}
      {events.length === 0 && (
        <Box marginTop={5} marginBottom={5} textAlign={"center"}>
          <Progress size="xs" mb={2} hasStripe isIndeterminate />
          <Text>Waiting for fresh content ... hold on.</Text>
          {LoadingSkeleton}
        </Box>
      )}
      {buttonTimeoutPassed && (
        <Box display="flex" justifyContent="space-between" padding={2}>
          {LoadMoreButton({ loadMore: loadEvents })}
          {/* <Button flex="1" marginLeft={2} onClick={newEvents}>
            Clear and load new
          </Button> */}
        </Box>
      )}
    </Box>
  );
}
