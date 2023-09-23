import { Box, Grid } from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import { useNClient } from "../state/client";
import { useParams } from "react-router-dom";
import { Events } from "../components/events";
import { filterByTags } from "../lib/default-filters";

export function TagRoute() {
  const [status] = useNClient((state) => [state.status]);

  const loadedEventsForRef = useRef<string | undefined>(undefined);

  const userLoadTimeout = useRef<number | null>(null);

  // URL params
  const { tag } = useParams();

  const view = `view-${tag}`;

  const loadedEventsRefMatchesNpub = () => {
    if (loadedEventsForRef.current === tag) {
      return true;
    } else {
      return false;
    }
  };

  const loadEvents = async (t: string) => {
    loadedEventsForRef.current = tag;
    await useNClient.getState().getEvents({
      token: view,
      query: {
        direction: "OLDER",
        filters: filterByTags([t]),
        stickyInterval: true,
        isLive: true,
      },
    });
  };

  useEffect(() => {
    return () => {
      if (userLoadTimeout.current) {
        clearTimeout(userLoadTimeout.current);
      }
      useNClient.getState().unsubscribeByToken(view);
    };
  }, []);

  useEffect(() => {
    if (
      ["online", "offline"].includes(useNClient.getState().status) &&
      tag &&
      !loadedEventsRefMatchesNpub()
    ) {
      loadEvents(tag);
    }
  }, [status, tag]);

  return (
    <Grid templateColumns={["1fr", "2fr 1fr"]} gap={20}>
      <Box>
        <Events view={view} />
      </Box>

      <Box display="flex" flexDirection="column">
        {/* <Heading as="h2" size="md" marginBottom={4}>
          Broadcast to the Network
        </Heading>
        <CreateEventForm /> */}
      </Box>
    </Grid>
  );
}
