import { NFilters } from "@nostr-ts/common";
import { Box, Text } from "@chakra-ui/react";
import { useRef, useEffect, useState } from "react";
import { MAX_EVENTS } from "../defaults";
import { useNClient } from "../state/client";
import { Events } from "./events";
import { ListSelection } from "./list-selection";
import {
  filterByAuthor,
  filterByMentions,
  filterDefault,
} from "../lib/default-filters";

export function EventsFeeds() {
  const [connected, followingUserIds, keypairIsLoaded, keypair] = useNClient(
    (state) => [
      state.connected,
      state.followingUserIds,
      state.keypairIsLoaded,
      state.keypair,
    ]
  );

  const isInitDone = useRef<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const activeFilters = useRef<NFilters>(filterDefault());

  const onMount = async () => {
    if (!connected || isInitDone.current) return;
    // Set the default, "initial" view
    await useNClient
      .getState()
      .setViewSubscription("global", activeFilters.current, {
        reset: true,
        limit: MAX_EVENTS,
        offset: 0,
      });
    isInitDone.current = true;
    setIsLoading(false);
  };

  /**
   * Handle initial load
   */
  useEffect(() => {
    onMount();
  }, []);

  /**
   * Handle the connection status change
   */
  useEffect(() => {
    if (connected) {
      onMount();
    }
    return () => {
      useNClient.getState().setView("");
    };
  }, [connected]);

  const changeFeed = async (feedName: string) => {
    if (!connected) return;
    setIsLoading(true);

    if (feedName === "global") {
      activeFilters.current = filterDefault();
    } else if (feedName === "following") {
      activeFilters.current = filterByAuthor(followingUserIds);
    } else if (feedName === "mentions") {
      activeFilters.current = filterByMentions([keypair.publicKey]);
    } else {
      const list = await useNClient.getState().getList(feedName);
      if (list && list.userPubkeys) {
        activeFilters.current = filterByAuthor(list.userPubkeys);
      } else {
        console.log("list not found");
        return;
      }
    }

    await useNClient
      .getState()
      .setViewSubscription(feedName, activeFilters.current, {
        reset: true,
        limit: MAX_EVENTS,
        offset: 0,
      });
    setIsLoading(false);
  };

  return (
    <Box>
      <ListSelection
        showFollowing={followingUserIds.length > 0}
        showMentions={keypairIsLoaded}
        changeFeed={changeFeed}
      />
      <Box overflowY="auto">
        {!isLoading ? (
          <Events />
        ) : (
          <Box marginTop={5} marginBottom={5} textAlign={"center"}>
            <Text>Changing feed ...</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
