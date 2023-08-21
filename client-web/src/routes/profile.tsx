import { Heading, Box, Text, Grid } from "@chakra-ui/react";
import { NEVENT_KIND, NFilters, NUserBase } from "@nostr-ts/common";
import { useState, useEffect } from "react";
import { useNClient } from "../state/client";
import { NUser } from "@nostr-ts/web";
import { useParams } from "react-router-dom";
import { User } from "../components/user";
import { Events } from "../components/events";
import { MAX_EVENTS } from "../defaults";
import { CreateEventForm } from "../components/create-event-form";

export function UserProfileRoute() {
  const [connected, eventsEqualOrMoreThanMax] = useNClient((state) => [
    state.connected,
    state.events.length >= state.maxEvents,
  ]);
  const [user, setUser] = useState<NUserBase | null>(null);

  const params = useParams<{ pubkey: string }>();
  const pubkey = params.pubkey || "";

  const view = `profile-${pubkey}`;
  const defaultFilters = new NFilters({
    limit: MAX_EVENTS,
    authors: [pubkey],
    kinds: [NEVENT_KIND.SHORT_TEXT_NOTE, NEVENT_KIND.LONG_FORM_CONTENT],
  });

  /**
   * Handle initial load
   */
  useEffect(() => {
    const init = async () => {
      if (!connected) return;
      await useNClient.getState().clearEvents();
      await useNClient.getState().setViewSubscription(view, defaultFilters);

      // USER

      if (!user) {
        const dbUser = await useNClient.getState().getUser(pubkey);
        if (dbUser) {
          setUser(dbUser);
        } else {
          setUser(
            new NUser({
              pubkey,
            })
          );
        }
      }

      await useNClient.getState().count({
        filters: new NFilters({
          kinds: [3],
          "#p": [pubkey],
        }),
      });
    };
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
          <Heading size="lg">Profile</Heading>
          {user && <User user={user} />}
        </Box>
        <Box>
          {connected ? (
            <Events
              view={view}
              filters={defaultFilters}
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
