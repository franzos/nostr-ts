import { Heading, Box, Text, Grid } from "@chakra-ui/react";
import {
  CLIENT_MESSAGE_TYPE,
  NEVENT_KIND,
  NFilters,
  decodeBech32,
} from "@nostr-ts/common";
import { useState, useEffect, useRef } from "react";
import { useNClient } from "../state/client";
import { NUser } from "@nostr-ts/web";
import { useParams } from "react-router-dom";
import { User } from "../components/user";
import { Events } from "../components/events";
import { MAX_EVENTS } from "../defaults";
import { CreateEventForm } from "../components/create-event-form";
import { UserRecord } from "../state/base-types";

export function ProfileRoute() {
  const [connected, eventsEqualOrMoreThanMax] = useNClient((state) => [
    state.connected,
    state.events.length >= state.maxEvents,
  ]);
  const [userRecord, setUserRecord] = useState<UserRecord | null>(null);
  const [relayUrls, setrelayUrls] = useState<string[]>([]);

  const [publicKey, setPublicKey] = useState<string>("");

  const { nprofile } = useParams();

  const view = useRef("");

  const loadUser = async (pubkey: string) => {
    if (!connected) return;
    const dbUser = await useNClient.getState().getUser(pubkey);
    if (dbUser) {
      setUserRecord(dbUser);
      setrelayUrls(dbUser.relayUrls);
    } else {
      setUserRecord({
        user: new NUser({
          pubkey,
        }),
        relayUrls,
      });
    }
  };

  const count = async (pubkey: string) => {
    await useNClient.getState().count({
      type: CLIENT_MESSAGE_TYPE.COUNT,
      filters: new NFilters({
        kinds: [3],
        "#p": [pubkey],
      }),
      options: {
        timeoutIn: 10000,
      },
    });
  };

  const init = async (nprofileString: string) => {
    const decoded = decodeBech32(nprofileString);
    const relayUrls: string[] = [];
    let pubkey: string = "";
    decoded.tlvItems.map((item) => {
      if (item.type === 0) {
        pubkey = item.value as string;
      }
      if (item.type === 1) {
        relayUrls.push(item.value as string);
      }
    });
    setrelayUrls(relayUrls);
    setPublicKey(pubkey);
    view.current = `profile-${pubkey}`;
    await loadUser(pubkey);
    await count(pubkey);
  };

  useEffect(() => {
    try {
      if (nprofile) {
        init(nprofile);
      }
    } catch (e) {
      console.log(e);
    }
  }, []);

  // const view = `profile-${publicKey}`;
  const defaultFilters = new NFilters({
    limit: MAX_EVENTS,
    authors: [publicKey],
    kinds: [NEVENT_KIND.SHORT_TEXT_NOTE, NEVENT_KIND.LONG_FORM_CONTENT],
  });

  // const init = async () => {
  //   if (!connected) return;

  //   // USER

  //   if (!userRecord || userRecord.user.pubkey !== publicKey) {
  //     await useNClient.getState().setViewSubscription(view, defaultFilters, {
  //       reset: true,
  //     });

  //     const dbUser = await useNClient.getState().getUser(publicKey);
  //     if (dbUser) {
  //       setUserRecord(dbUser);
  //       setrelayUrls(dbUser.relayUrls);
  //     } else {
  //       setUserRecord({
  //         user: new NUser({
  //           pubkey,
  //         }),
  //         relayUrls,
  //       });

  //       for (const params of searchParams.entries()) {
  //         if (params[0] === "relays") {
  //           setrelayUrls(params[1].split(","));
  //         }
  //       }
  //     }
  //   }

  //   await useNClient.getState().count({
  //     type: CLIENT_MESSAGE_TYPE.COUNT,
  //     filters: new NFilters({
  //       kinds: [3],
  //       "#p": [pubkey],
  //     }),
  //     options: {
  //       timeoutIn: 10000,
  //     },
  //   });
  // };

  /**
   * Handle initial load
   */
  // useEffect(() => {
  //   init();
  // }, []);

  // useEffect(() => {
  //   init();
  // }, [pubkey]);

  /**
   * Remove subscription when we hit the limit
   */
  useEffect(() => {
    const remove = async () => {
      if (!connected) return;
      await useNClient.getState().removeViewSubscription(view.current);
    };

    if (eventsEqualOrMoreThanMax) {
      remove();
    }
  }, [eventsEqualOrMoreThanMax]);

  return (
    <Grid templateColumns={["1fr", "2fr 1fr"]} gap={20}>
      <Box maxHeight="80vh" overflowY="auto">
        <Box>
          {userRecord && (
            <User
              user={userRecord.user}
              options={{
                showAbout: true,
                showBanner: true,
                showFollowing: true,
                relayUrls: userRecord.relayUrls,
              }}
            />
          )}
        </Box>
        <Box>
          {connected ? (
            <Events
              view={view.current}
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
