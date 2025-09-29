import { useEffect, useRef, useState } from "react";
import { Box, Button, Progress, Text } from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { Event } from "../components/event";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

interface EventsProps {
  view: string;
  changingView?: boolean;
}

export function Events({ view, changingView }: EventsProps) {
  const [events, eventsNewerCount, isInInitialLoad, bufferCount] = useNClient((state) => [
    state.events[view] || [],
    state.eventsNewer[view]?.length || 0,
    state.isInInitialLoadWindow(view),
    state.initialLoadBuffers[view]?.length || 0,
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

  // Set up virtualizer with window scrolling
  const virtualizer = useWindowVirtualizer({
    count: events.length,
    estimateSize: () => 200, // Estimated height for each event card
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Detect infinite scroll - when last item is visible and we have events
  useEffect(() => {
    const [lastItem] = [...virtualItems].reverse();

    if (!lastItem) {
      return;
    }

    if (
      lastItem.index >= events.length - 1 &&
      events.length > 0 &&
      !changingView
    ) {
      loadEvents();
    }
  }, [virtualItems, events.length, changingView]);

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
              Loading events... {bufferCount} received ({countdown}s)
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
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            transform: `translateY(${virtualItems[0]?.start ?? 0}px)`,
          }}
        >
          {virtualItems.map((virtualItem) => {
            const eventData = events[virtualItem.index];
            return (
              <div
                key={eventData?.event.id || virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  width: "100%",
                }}
              >
                <Box mb={2}>
                  <Event
                    data={eventData}
                    level={0}
                    linkPreviewProxyUrl={linkPreviewProxyUrl}
                  />
                </Box>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
