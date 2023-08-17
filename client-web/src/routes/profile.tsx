import { Heading, Box, Text } from "@chakra-ui/react";
import { NEVENT_KIND, NFilters, NUserBase } from "@nostr-ts/common";
import { useState, useEffect } from "react";
import { useNClient } from "../state/client";
import { NUser } from "@nostr-ts/web";
import { useParams } from "react-router-dom";
import { User } from "../components/user";
import { Events } from "../components/events";

export function UserProfileRoute() {
  const [connected] = useNClient((state) => [state.connected]);
  const [user, setUser] = useState<NUserBase | null>(null);
  const params = useParams<{ pubkey: string }>();

  //   const [subscriptionIsActive, setSubscriptionIsActive] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!params.pubkey) {
        return;
      }
      if (connected) {
        // setSubscriptionIsActive(true);
        const subscriptions = useNClient.getState().subscriptions();
        if (subscriptions) {
          const sub = subscriptions.find(
            (s) =>
              s.filters &&
              s.filters.authors &&
              s.filters?.authors.includes(params.pubkey)
          );
          if (sub) {
            return;
          }
        }

        useNClient.getState().unsubscribeAll();
        useNClient.getState().clearEvents();
        useNClient.getState().subscribe(
          new NFilters({
            limit: 25,
            authors: [params.pubkey],
            kinds: [NEVENT_KIND.SHORT_TEXT_NOTE, NEVENT_KIND.LONG_FORM_CONTENT],
          })
        );
      }
      if (!user) {
        const dbUser = await useNClient.getState().getUser(params.pubkey);
        if (dbUser) {
          setUser(dbUser);
        } else {
          setUser(
            new NUser({
              pubkey: params.pubkey,
            })
          );
        }
      }
    };
    load();
    return () => {
      useNClient.getState().unsubscribeAll();
      useNClient.getState().clearEvents();
      //   setSubscriptionIsActive(false);
    };
  }, [params.pubkey, connected, user]);

  return (
    <>
      <Box>
        <Heading size="lg">Profile</Heading>
        {user && <User user={user} />}
      </Box>
      <Box>{connected ? <Events /> : <Text>Not connected.</Text>}</Box>
    </>
  );
}
