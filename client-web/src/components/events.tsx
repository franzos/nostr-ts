import React from "react";
import { Box, Button, Progress, Text } from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { Event } from "../components/event";
import { useEffect, useRef, useState } from "react";
import { EVENTS_PER_PAGE } from "../defaults";

interface EventsProps {
  changingView?: boolean;
}

export function Events({ changingView }: EventsProps) {
  const [events, maxEvents] = useNClient((state) => [
    state.events,
    state.maxEvents,
  ]);

  const currentPage = useRef(1);
  const totalPages = useRef(1);

  const loadMoreRef = useRef<HTMLDivElement[]>([]);

  const throttleTimestamp = useRef(Date.now());

  const [buttonTimeoutPassed, setButtonTimeoutPassed] = useState(false);

  const calculateTotalPages = async () => {
    await useNClient
      .getState()
      .countEvents()
      .then((r) => {
        totalPages.current = Math.ceil(r / EVENTS_PER_PAGE);
      });
  };

  const loadEvents = async () => {
    if (
      throttleTimestamp.current > Date.now() - 2000 ||
      changingView === true
    ) {
      return;
    }
    throttleTimestamp.current = Date.now();
    const currCount = useNClient.getState().events.length;
    const loadCount = currentPage.current * EVENTS_PER_PAGE - currCount;
    if (loadCount > 0) {
      await useNClient.getState().getEvents({
        limit: loadCount,
        offset: currCount,
        view: useNClient.getState().activeView,
      });
    }
  };

  useEffect(() => {
    const initialLoad = setTimeout(async () => {
      await calculateTotalPages().then(async () => {
        await loadEvents();
      });
    }, 0);

    const loadEventsInterval = setInterval(async () => {
      await loadEvents();
    }, 2000);

    // Activate button after 3s
    const buttonTimeout = setTimeout(() => {
      setButtonTimeoutPassed(true);
    }, 5000);

    return () => {
      clearTimeout(initialLoad);
      clearInterval(loadEventsInterval);
      clearTimeout(buttonTimeout);
    };
  }, []);

  useEffect(() => {
    // Intersection Observer logic
    const observer = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting) {
        nextPage();
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

  const nextPage = async () => {
    const total = useNClient.getState().events.length;
    const expected = currentPage.current * EVENTS_PER_PAGE;

    const diff = expected - total;
    if (diff === 0) {
      await calculateTotalPages();
      currentPage.current = currentPage.current + 1;
      if (currentPage.current < totalPages.current) {
        await calculateTotalPages();
        await loadEvents();
      }
    } else {
      await loadEvents();
    }
  };

  const showButtons = events.length >= maxEvents || buttonTimeoutPassed;

  return (
    <Box style={{ overflowWrap: "break-word", wordWrap: "break-word" }}>
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
        </Box>
      )}
      {showButtons && (
        <Box display="flex" justifyContent="space-between" padding={2}>
          <Button flex="1" marginRight={2} onClick={nextPage}>
            Load more {useNClient.getState().activeView}
          </Button>
          {/* <Button flex="1" marginLeft={2} onClick={newEvents}>
            Clear and load new
          </Button> */}
        </Box>
      )}
    </Box>
  );
}
