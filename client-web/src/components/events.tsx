import { useEffect, useRef, useState } from "react";
import { Box, Button, Progress, Text } from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { Event } from "../components/event";
import { Virtuoso } from "react-virtuoso";

interface EventsProps {
  view: string;
  changingView?: boolean;
}

export function Events({ view, changingView }: EventsProps) {
  const [events, eventsNewerCount, isInInitialLoad] = useNClient((state) => [
    state.events[view] || [],
    state.eventsNewer[view]?.length || 0,
    state.isInInitialLoadWindow(view),
  ]);
  const [countdown, setCountdown] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
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

  // Update countdown timer and progress
  useEffect(() => {
    if (isInInitialLoad) {
      const timer = useNClient.getState().initialLoadTimers[view];
      if (timer) {
        const duration = 5000; // 5 seconds
        const startTime = timer - duration;

        const updateProgress = () => {
          const now = Date.now();
          const elapsed = now - startTime;
          const remaining = Math.max(0, Math.ceil((timer - now) / 1000));
          const progressPercent = Math.min(100, (elapsed / duration) * 100);

          setCountdown(remaining);
          setProgress(progressPercent);

          if (remaining > 0) {
            requestAnimationFrame(updateProgress);
          }
        };
        updateProgress();
      }
    } else {
      setProgress(0);
    }
  }, [isInInitialLoad, view]);

  return (
    <>
      {isInInitialLoad && (
        <Box mb={4}>
          <Progress
            value={progress}
            size="sm"
            colorScheme="blue"
            hasStripe
            isAnimated
            borderRadius="md"
          />
          <Box display="flex" alignItems="center" justifyContent="center" mt={2}>
            <Text fontSize="sm" color="gray.500">
              Loading events... ({countdown}s)
            </Text>
          </Box>
        </Box>
      )}
      {!isInInitialLoad && eventsNewerCount > 0 && (
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
