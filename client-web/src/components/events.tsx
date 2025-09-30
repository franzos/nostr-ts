import { useEffect, useRef, useState } from "react";
import { Box, Button, Progress, Text } from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { Event } from "../components/event";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useSettings } from "../state/settings";

interface EventsProps {
  view: string;
  changingView?: boolean;
}

export function Events({ view, changingView }: EventsProps) {
  const [events, eventsNewerCount, showLoading, loadingEndTime] = useNClient((state) => [
    state.events[view] || [],
    state.eventsNewer[view]?.length || 0,
    state.showLoadingBar[view] || false,
    state.loadingBarEndTime[view] || 0,
  ]);
  const newEventsBehavior = useSettings((state) => state.newEventsBehavior);
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
    // Custom merge logic based on settings
    if (newEventsBehavior === "top") {
      // Sort only new events, then add to top
      const newerEvents = useNClient.getState().eventsNewer[view] || [];
      const currentEvents = useNClient.getState().events[view] || [];

      // Sort the new events by timestamp (newest first)
      const sortedNewerEvents = [...newerEvents].sort((a, b) =>
        a.event.created_at > b.event.created_at ? -1 : 1
      );

      useNClient.setState((state) => ({
        events: {
          ...state.events,
          [view]: [...sortedNewerEvents, ...currentEvents],
        },
        eventsNewer: {
          ...state.eventsNewer,
          [view]: [],
        },
      }));
    } else {
      // Default sorted behavior
      useNClient.getState().mergeNewerEvents(view);
    }
  };

  // Update countdown timer and progress
  useEffect(() => {
    if (showLoading && loadingEndTime) {
      const duration = loadingEndTime - (Date.now() - (loadingEndTime - Date.now()));
      const startTime = loadingEndTime - duration;

      const updateProgress = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const remaining = Math.max(0, Math.ceil((loadingEndTime - now) / 1000));
        const progressPercent = Math.min(100, (elapsed / duration) * 100);

        setCountdown(remaining);
        setProgress(progressPercent);

        if (remaining > 0 && showLoading) {
          requestAnimationFrame(updateProgress);
        }
      };
      updateProgress();
    } else {
      setProgress(0);
    }
  }, [showLoading, loadingEndTime, view]);

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
      {showLoading && (
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
              Loading events... {events.length} loaded ({countdown}s)
            </Text>
          </Box>
        </Box>
      )}
      {!showLoading && eventsNewerCount > 0 && (
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
