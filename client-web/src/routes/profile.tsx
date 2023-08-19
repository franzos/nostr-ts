import { Heading, Box, Text } from "@chakra-ui/react";
import { NEVENT_KIND, NFilters, NUserBase } from "@nostr-ts/common";
import { useState, useEffect } from "react";
import { useNClient } from "../state/client";
import { NUser } from "@nostr-ts/web";
import { useParams } from "react-router-dom";
import { User } from "../components/user";
import { Events } from "../components/events";
import { MAX_EVENTS } from "../defaults";

export function UserProfileRoute() {
  const [connected] = useNClient((state) => [state.connected]);
  const [user, setUser] = useState<NUserBase | null>(null);
  const [eventsEqualOrMoreThanMax] = useNClient((state) => [
    state.maxEvents === state.events.length,
  ]);

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
    };
    init();
  }, []);

  /**
   * Remove subscription when we hit the limit
   */
  useEffect(() => {
    const remove = async () => {
      if (!connected) return;
      await useNClient.getState().removeViewSubscription("welcome");
    };

    if (eventsEqualOrMoreThanMax) {
      console.log(
        "removing subscription < =================================================="
      );
      remove();
    }
  }, [eventsEqualOrMoreThanMax]);

  return (
    <>
      <Box>
        <Heading size="lg">Profile</Heading>
        {user && <User user={user} />}
      </Box>
      <Box>
        {connected ? (
          <Events view={view} filters={defaultFilters} connected={connected} />
        ) : (
          <Text>Not connected.</Text>
        )}
      </Box>
    </>
  );
}
