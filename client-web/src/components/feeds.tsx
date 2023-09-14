import { NFilters } from "@nostr-ts/common";
import { Box } from "@chakra-ui/react";
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

  const activeFilters = useRef<NFilters>(filterDefault());
  const [view, setView] = useState<string>("global"); // ["global", "following", "mentions", "list"
  const changingView = useRef<boolean>(false);

  const onMount = async () => {
    if (!useNClient.getState().connected || isInitDone.current) {
      return;
    }
    // Set the default, "initial" view
    isInitDone.current = true;

    await useNClient
      .getState()
      .setViewSubscription(view, activeFilters.current, {
        reset: true,
        limit: MAX_EVENTS,
        offset: 0,
      });
    isInitDone.current = true;
  };

  useEffect(() => {
    return () => {
      useNClient.getState().removeViewSubscription(view);
    };
  }, []);

  /**
   * Handle initial load
   */
  useEffect(() => {
    if (connected) {
      onMount();
    }
  }, [connected]);

  const changeFeed = async (feedName: string) => {
    if (!useNClient.getState().connected) return;
    changingView.current = true;
    useNClient.getState().setView(feedName);
    setView(feedName);

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
        console.warn("List not found.");
        changingView.current = false;
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
  };

  return (
    <Box>
      <Box p={2}>
        <ListSelection
          showFollowing={followingUserIds.length > 0}
          showMentions={keypairIsLoaded}
          changeFeed={changeFeed}
        />
      </Box>
      <Events changingView={changingView.current} />
    </Box>
  );
}
