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

interface EventsFeedsProps {
  connected: boolean;
}

export function EventsFeeds({ connected }: EventsFeedsProps) {
  const [followingUserIds, keypairIsLoaded, keypair] = useNClient((state) => [
    state.followingUserIds,
    state.keypairIsLoaded,
    state.keypair,
  ]);

  const isInitDone = useRef<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const activeFilters = useRef<NFilters>(filterDefault());
  const view = useRef<string>("global");
  const changingView = useRef<boolean>(false);

  const onMount = async () => {
    if (!useNClient.getState().connected || isInitDone.current) {
      return;
    }
    // Set the default, "initial" view
    isInitDone.current = true;

    await useNClient
      .getState()
      .setViewSubscription(view.current, activeFilters.current, {
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
    if (connected) {
      onMount();
    }
    return () => {
      useNClient.getState().removeViewSubscription(view.current);
    };
  }, [connected]);

  /**
   * Handle the connection status change
   */
  // useEffect(() => {
  //   if (connected) {
  //     onMount();
  //   }
  //   return () => {
  //     useNClient.getState().setView("");
  //   };
  // }, [connected]);

  const changeFeed = async (feedName: string) => {
    if (!useNClient.getState().connected) return;
    setIsLoading(true);
    changingView.current = true;
    useNClient.getState().setView(feedName);
    view.current = feedName;

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
    changingView.current = false;
    setIsLoading(false);
  };

  const InfoText = connected ? (
    <Text textAlign="center" marginTop={4}>
      Changing feed ...
    </Text>
  ) : (
    <Text textAlign="center" marginTop={4}>
      Not connected to the network
    </Text>
  );

  return (
    <Box>
      <ListSelection
        showFollowing={followingUserIds.length > 0}
        showMentions={keypairIsLoaded}
        changeFeed={changeFeed}
      />
      <Box overflowY="auto">
        {!isLoading ? (
          <Events view={view.current} changingView={changingView.current} />
        ) : (
          <Box marginTop={5} marginBottom={5} textAlign={"center"}>
            {InfoText}
          </Box>
        )}
      </Box>
    </Box>
  );
}
