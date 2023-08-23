import { Heading, Box, Text, Grid } from "@chakra-ui/react";
import { NEVENT_KIND, NFilters } from "@nostr-ts/common";
import { useState, useEffect } from "react";
import { useNClient } from "../state/client";
import { NUser } from "@nostr-ts/web";
import { useParams, useSearchParams } from "react-router-dom";
import { User } from "../components/user";
import { Events } from "../components/events";
import { MAX_EVENTS } from "../defaults";
import { CreateEventForm } from "../components/create-event-form";
import { UserRecord } from "../state/base-types";

export function UserMentionsRoute() {
  const [connected, eventsEqualOrMoreThanMax] = useNClient((state) => [
    state.connected,
    state.events.length >= state.maxEvents,
  ]);
  const [userRecord, setUserRecord] = useState<UserRecord | null>(null);
  const [relayIds, setRelayIds] = useState<string[]>([]);

  const [searchParams] = useSearchParams();

  const params = useParams<{ pubkey: string }>();
  const pubkey = params.pubkey || "";

  const view = `mentions-${pubkey}`;
  const defaultFilters = new NFilters({
    limit: MAX_EVENTS,
    authors: [pubkey],
    kinds: [NEVENT_KIND.SHORT_TEXT_NOTE, NEVENT_KIND.LONG_FORM_CONTENT],
    "#p": [pubkey],
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

      if (!userRecord) {
        const dbUser = await useNClient.getState().getUser(pubkey);
        if (dbUser) {
          setUserRecord(dbUser);
          setRelayIds(dbUser.relayIds);
        } else {
          setUserRecord({
            user: new NUser({
              pubkey,
            }),
            relayIds,
          });

          for (const params of searchParams.entries()) {
            if (params[0] === "relays") {
              setRelayIds(params[1].split(","));
            }
          }
        }
      }
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

  // TODO: {user && <User user={user} relayId={""} />}
  return (
    <Grid templateColumns={["1fr", "2fr 1fr"]} gap={20}>
      <Box maxHeight="80vh" overflowY="auto">
        <Box>
          <Heading size="lg">Profile</Heading>
          {userRecord && <User user={userRecord.user} relayIds={relayIds} />}
        </Box>
        <Box>
          {connected ? (
            <Events
              userComponent={User}
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
