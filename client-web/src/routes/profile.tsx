import { Box, Grid, Spinner, Text } from "@chakra-ui/react";
import { UserRecord, decodeBech32 } from "@nostr-ts/common";
import { useState, useEffect, useRef } from "react";
import { useNClient } from "../state/client";
import { useParams } from "react-router-dom";
import { User } from "../components/user";
import { Events } from "../components/events";
import { filterByAuthor } from "../lib/default-filters";

export function ProfileRoute() {
  const [status] = useNClient((state) => [state.status]);

  const loadedEventsForRef = useRef<string | undefined>(undefined);

  const pubkey = useRef<string | null>(null);
  const userLoadTimeout = useRef<number | null>(null);
  const [userData, setUserData] = useState<UserRecord | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(false);

  // URL params
  const { npub } = useParams();

  const view = `profile-${npub}`;

  const loadedEventsRefMatchesNpub = () => {
    if (loadedEventsForRef.current === npub) {
      return true;
    } else {
      return false;
    }
  };

  const getUser = async (pk: string, retryCount = 0) => {
    setIsLoadingUser(true);
    await useNClient
      .getState()
      .getUser(pk)
      .then((r) => {
        if (r) {
          setUserData(r);
          setIsLoadingUser(false);
          if (userLoadTimeout.current) {
            clearTimeout(userLoadTimeout.current);
          }
        } else {
          userLoadTimeout.current = setTimeout(async () => {
            console.log(`Retrying to load user ${pk} ...`);

            if (retryCount === 2) {
              await useNClient.getState().requestInformation(
                {
                  idsOrKeys: [pk],
                  source: "users",
                },
                {
                  timeoutIn: 10000,
                }
              );
            } else if (retryCount > 20) {
              setIsLoadingUser(false);
              if (userLoadTimeout.current) {
                clearTimeout(userLoadTimeout.current);
              }
              return;
            }
            await getUser(pk, retryCount + 1);
          }, 1000);
        }
      });
  };

  const count = async (pk: string) => {
    await useNClient.getState().count(pk);
  };

  const onMount = async () => {
    if (!npub) return;
    try {
      const decoded = decodeBech32(npub);
      let pk = undefined;
      for (const item of decoded.tlvItems) {
        if (item.type === 0) {
          pk = item.value as string;
          break;
        }
      }
      if (!pk) return;
      pubkey.current = pk;
      setUserData(null);
      await getUser(pk);
      await count(pk);
    } catch (e) {
      console.log(e);
      return;
    }
  };

  const loadEvents = async (pk: string) => {
    loadedEventsForRef.current = npub;
    await useNClient.getState().getEvents({
      token: view,
      query: {
        direction: "OLDER",
        filters: filterByAuthor([pk]),
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
    if (["online", "offline"].includes(useNClient.getState().status)) {
      onMount();
    }
  }, [status, npub]);

  useEffect(() => {
    if (
      ["online", "offline"].includes(useNClient.getState().status) &&
      pubkey.current &&
      !loadedEventsRefMatchesNpub()
    ) {
      loadEvents(pubkey.current);
    }
  }, [status, pubkey.current]);

  return (
    <Grid templateColumns={["1fr", "2fr 1fr"]} gap={20}>
      <Box>
        <Box mb={4}>
          {isLoadingUser && (
            <Box textAlign="center">
              <Text>Just a sec ... Searching the Matrix for the user.</Text>
              <Spinner p={10} mt={2} />
            </Box>
          )}

          {userData && (
            <User
              user={userData.user}
              opts={{
                showAbout: true,
                showBanner: true,
                showFollowing: true,
                relayUrls: userData.relayUrls,
                showBlock: true,
              }}
            />
          )}
        </Box>
        <Events view={view} />
      </Box>

      <Box display="flex" flexDirection="column"></Box>
    </Grid>
  );
}
