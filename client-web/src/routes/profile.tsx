import { Heading, Box, Grid } from "@chakra-ui/react";
import { UserRecord, decodeBech32 } from "@nostr-ts/common";
import { useState, useEffect, useRef } from "react";
import { useNClient } from "../state/client";
import { useParams } from "react-router-dom";
import { User } from "../components/user";
import { Events } from "../components/events";
import { MAX_EVENTS } from "../defaults";
import { CreateEventForm } from "../components/create-event-form";
import { filterByAuthor } from "../lib/default-filters";

export function ProfileRoute() {
  const [connected] = useNClient((state) => [state.connected]);

  const isInitDone = useRef<boolean>(false);

  const pubkey = useRef("");
  const userLoadTimeout = useRef<number | null>(null);
  const [userData, setUserData] = useState<UserRecord | null>(null);

  // URL params
  const { npub } = useParams();

  const view = `profile-${npub}`;

  const getUser = async (retryCount = 0) => {
    await useNClient
      .getState()
      .getUser(pubkey.current)
      .then((r) => {
        if (r) {
          setUserData(r);
        } else {
          userLoadTimeout.current = setTimeout(async () => {
            if (retryCount > 20) {
              if (userLoadTimeout.current) {
                clearTimeout(userLoadTimeout.current);
              }
              return;
            }
            await getUser(retryCount + 1);
          }, 1000);
        }
      });
  };

  const count = async (pubkey: string) => {
    await useNClient.getState().count(pubkey);
  };

  const onMount = async (nprofileString: string) => {
    if (!useNClient.getState().connected || isInitDone.current) return;
    isInitDone.current = true;
    try {
      const decoded = decodeBech32(nprofileString);
      for (const item of decoded.tlvItems) {
        if (item.type === 0) {
          pubkey.current = item.value as string;
          break;
        }
      }
    } catch (e) {
      console.log(e);
      return;
    }
    await Promise.all([
      getUser(),
      useNClient
        .getState()
        .setViewSubscription(view, filterByAuthor([pubkey.current]), {
          reset: true,
          limit: MAX_EVENTS,
          offset: 0,
        }),
    ]);
    await count(pubkey.current);
  };

  useEffect(() => {
    useNClient.getState().setView(view);
    if (npub) {
      onMount(npub);
    }

    return () => {
      if (userLoadTimeout.current) {
        clearTimeout(userLoadTimeout.current);
      }
      useNClient.getState().removeViewSubscription(view);
    };
  }, []);

  useEffect(() => {
    if (connected) {
      if (npub) {
        onMount(npub);
      }
    }
  }, [connected]);

  return (
    <Grid templateColumns={["1fr", "2fr 1fr"]} gap={20}>
      <Box>
        {userData && (
          <Box mb={4}>
            <User
              user={userData.user}
              options={{
                showAbout: true,
                showBanner: true,
                showFollowing: true,
                relayUrls: userData.relayUrls,
                showBlock: true,
              }}
            />
          </Box>
        )}
        <Box overflowY="auto">
          <Events />
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
