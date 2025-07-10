import { NFilters } from "@nostr-ts/common";
import { Box } from "@chakra-ui/react";
import { useRef, useEffect, useState } from "react";
import { useNClient } from "../state/client";
import { Events } from "./events";
import { ListSelection } from "./list-selection";
import {
  filterByAuthor,
  filterByMentions,
  filterDefault,
} from "../lib/default-filters";

export function EventsFeeds() {
  const [status, keypairIsLoaded, keypair] = useNClient((state) => [
    state.status,
    state.keypairIsLoaded,
    state.keypair,
  ]);

  const activeFilters = useRef<NFilters>(filterDefault());
  const [view, setView] = useState<string>("global"); // ["global", "following", "mentions", "list"
  const changingView = useRef<boolean>(false);

  const onMount = async () => {
    // Set the default, "initial" view
    activeFilters.current = filterDefault();
    setView("global");

    // Start initial load timer
    useNClient.getState().startInitialLoadTimer("global", 5000);
    
    await useNClient.getState().getEvents({
      token: "global",
      query: {
        direction: "OLDER",
        filters: activeFilters.current,
        stickyInterval: true,
        isLive: true,
      },
    });
  };

  useEffect(() => {
    if (["online", "offline"].includes(useNClient.getState().status)) {
      onMount();
    }
    return () => {
      useNClient.getState().unsubscribeByToken(view);
    };
  }, []);

  /**
   * Handle initial load
   */
  useEffect(() => {
    if (["online", "offline"].includes(useNClient.getState().status)) {
      onMount();
    }
  }, [status]);

  const changeFeed = async (feedName: string) => {
    changingView.current = true;

    await useNClient.getState().unsubscribeByToken(view);
    setView(feedName);

    if (feedName === "global") {
      activeFilters.current = filterDefault();
    } else if (feedName === "following") {
      const following = await useNClient.getState().getAllUsersFollowing();
      if (following) {
        activeFilters.current = filterByAuthor(
          following?.map((f) => f.user.pubkey)
        );
      }
    } else if (feedName === "mentions") {
      activeFilters.current = filterByMentions([keypair.publicKey]);
    } else {
      const list = await useNClient.getState().getList(feedName);
      if (list && list.userPubkeys) {
        activeFilters.current = filterByAuthor(list.userPubkeys);
      } else {
        console.error("List not found.");
        changingView.current = false;
        return;
      }
    }

    // Start initial load timer for new feed
    useNClient.getState().startInitialLoadTimer(feedName, 5000);
    
    await useNClient.getState().getEvents({
      token: feedName,
      query: {
        filters: activeFilters.current,
        stickyInterval: true,
        isLive: true,
      },
    });
    changingView.current = false;
  };

  return (
    <Box>
      <Box p={2}>
        <ListSelection
          showFollowing={true}
          showMentions={keypairIsLoaded}
          changeFeed={changeFeed}
        />
      </Box>
      <Events key={view} changingView={changingView.current} view={view} />
    </Box>
  );
}
