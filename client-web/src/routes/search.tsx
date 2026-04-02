import { Box, Grid } from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import { useNClient } from "../state/client";
import { useParams } from "react-router-dom";
import { Events } from "../components/events";
import { filterBySearch } from "../lib/default-filters";

export function SearchRoute() {
  const [status] = useNClient((state) => [state.status]);

  const loadedEventsForRef = useRef<string | undefined>(undefined);

  const { query } = useParams();

  const view = `view-search-${query}`;

  const loadedEventsRefMatchesQuery = () => {
    return loadedEventsForRef.current === query;
  };

  const loadEvents = async (q: string) => {
    loadedEventsForRef.current = q;
    await useNClient.getState().getEvents({
      token: view,
      query: {
        direction: "OLDER",
        filters: filterBySearch(q),
        stickyInterval: true,
        isLive: false,
      },
    });
  };

  useEffect(() => {
    return () => {
      useNClient.getState().unsubscribeByToken(view);
    };
  }, [query]);

  useEffect(() => {
    if (
      ["online", "offline"].includes(useNClient.getState().status) &&
      query &&
      !loadedEventsRefMatchesQuery()
    ) {
      loadEvents(query);
    }
  }, [status, query]);

  return (
    <Grid templateColumns={["1fr", "2fr 1fr"]} gap={20}>
      <Box>
        <Events view={view} />
      </Box>

      <Box display="flex" flexDirection="column"></Box>
    </Grid>
  );
}
