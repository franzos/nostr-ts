import React from "react";
import { Box, Button, Text } from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { Event } from "../components/event";
import { useEffect, useRef, useState } from "react";
import { EVENTS_PER_PAGE } from "../defaults";

export function Events() {
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
    if (throttleTimestamp.current > Date.now() - 2000) {
      return;
    }
    throttleTimestamp.current = Date.now();
    const currCount = useNClient.getState().events.length;
    const loadCount = currentPage.current * EVENTS_PER_PAGE - currCount;
    if (loadCount > 0) {
      await useNClient.getState().getEvents({
        limit: loadCount,
        offset: currCount,
      });
    }
  };

  useEffect(() => {
    const initialLoad = setTimeout(async () => {
      await calculateTotalPages().then(async () => {
        await loadEvents();
      });
    }, 250);

    const loadEventsInterval = setInterval(async () => {
      await loadEvents();
    }, 2000);

    // Activate button after 3s
    const buttonTimeout = setTimeout(() => {
      setButtonTimeoutPassed(true);
    }, 3000);

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
    console.log(`next page; total: ${total}, expected: ${expected}`);
    const diff = expected - total;
    if (diff === 0) {
      console.log(`next page; diff: ${diff}`);
      await calculateTotalPages();
      currentPage.current = currentPage.current + 1;
      if (currentPage.current < totalPages.current) {
        await calculateTotalPages();
        await loadEvents();
      } else {
        console.log(currentPage.current, totalPages.current);
      }
    } else {
      console.log(`Not next page; diff: ${diff}`);
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
          <Text>Waiting for fresh content ... hold on.</Text>
        </Box>
      )}
      {showButtons && (
        <Box display="flex" justifyContent="space-between" padding={2}>
          <Button flex="1" marginRight={2} onClick={nextPage}>
            Load more
          </Button>
          {/* <Button flex="1" marginLeft={2} onClick={newEvents}>
            Clear and load new
          </Button> */}
        </Box>
      )}
    </Box>
  );
}
