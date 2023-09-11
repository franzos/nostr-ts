import { Heading, Box, Text, Grid } from "@chakra-ui/react";
import { NFilters, UserRecord, decodeBech32 } from "@nostr-ts/common";
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

  const activeFilters = useRef<NFilters | null>(null);

  const pubkey = useRef("");
  const [userData, setUserData] = useState<UserRecord | null>(null);

  // URL params
  const { nprofile } = useParams();

  const view = `profile-${nprofile}`;

  const getUser = async () => {
    await useNClient
      .getState()
      .getUser(pubkey.current)
      .then((r) => {
        if (r) {
          setUserData(r);
        }
      });
  };

  const count = async (pubkey: string) => {
    await useNClient.getState().count(pubkey);
  };

  const onMount = async (nprofileString: string) => {
    if (!connected || isInitDone.current) return;
    isInitDone.current = true;
    const decoded = decodeBech32(nprofileString);
    const relayUrls: string[] = [];
    let key: string = "";
    decoded.tlvItems.map((item) => {
      if (item.type === 0) {
        key = item.value as string;
        return;
      }
      if (item.type === 1) {
        relayUrls.push(item.value as string);
      }
    });
    pubkey;
    setUserData({
      user: {
        pubkey: key,
      },
      relayUrls: relayUrls,
    });
    pubkey.current = key;
    activeFilters.current = filterByAuthor([key]);
    await useNClient
      .getState()
      .setViewSubscription(view, activeFilters.current, {
        reset: true,
        limit: MAX_EVENTS,
        offset: 0,
      });
    await getUser();
    await count(key);
  };

  useEffect(() => {
    useNClient.getState().setView(view);
    try {
      if (nprofile) {
        onMount(nprofile);
      }
    } catch (e) {
      console.log(e);
    }

    return () => {
      useNClient.getState().setView("");
    };
  }, []);

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
          <Box>
            {connected && activeFilters.current ? (
              <Events view={view} />
            ) : (
              <Text>Not connected.</Text>
            )}
          </Box>
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
