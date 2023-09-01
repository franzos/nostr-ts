import { Heading, Box, Text, Grid } from "@chakra-ui/react";
import { NEVENT_KIND, NFilters } from "@nostr-ts/common";
import { useEffect } from "react";
import { useNClient } from "../state/client";
import { Events } from "../components/events";
import { MAX_EVENTS } from "../defaults";
import { CreateEventForm } from "../components/create-event-form";
import { User } from "../components/user";

export function FollowingFeedRoute() {
  const [connected, eventsEqualOrMoreThanMax, followingUserIds] = useNClient(
    (state) => [
      state.connected,
      state.events.length >= state.maxEvents,
      state.followingUserIds,
    ]
  );
  const filters = new NFilters({
    limit: MAX_EVENTS,
    authors: followingUserIds,
    kinds: [NEVENT_KIND.SHORT_TEXT_NOTE, NEVENT_KIND.LONG_FORM_CONTENT],
  });

  const view = `following-feed`;

  const init = async () => {
    if (!connected) return;

    await useNClient.getState().setMaxEvents(MAX_EVENTS);
    await useNClient.getState().clearEvents();
    await useNClient.getState().setViewSubscription(view, filters);
  };

  /**
   * Handle initial load
   */
  useEffect(() => {
    init();
  }, []);

  /**
   * Remove subscription when we hit the limit
   */
  useEffect(() => {
    const remove = async () => {
      if (!connected) return;
      await useNClient.getState().removeViewSubscription(view);
    };

    if (eventsEqualOrMoreThanMax) {
      remove();
    }
  }, [eventsEqualOrMoreThanMax]);

  return (
    <Grid templateColumns={["1fr", "2fr 1fr"]} gap={20}>
      <Box maxHeight="80vh" overflowY="auto">
        <Box>
          {connected ? (
            <Events
              userComponent={User}
              view={view}
              filters={filters}
              connected={connected}
            />
          ) : (
            <Text>Not connected.</Text>
          )}
        </Box>
      </Box>

      <Box display="flex" flexDirection="column">
        <Heading as="h2" size="md" marginBottom={4}>
          Broadcast to the Network
        </Heading>
        <CreateEventForm />
      </Box>
    </Grid>
  );
}
