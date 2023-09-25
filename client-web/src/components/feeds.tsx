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
  const [status, followingUserIds, keypairIsLoaded, keypair] = useNClient(
    (state) => [
      state.status,
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
    if (isInitDone.current) {
      return;
    }
    // Set the default, "initial" view
    isInitDone.current = true;

    activeFilters.current = filterDefault();
    setView("global");

    await useNClient.getState().getEvents({
      token: view,
      query: {
        direction: "OLDER",
        filters: activeFilters.current,
        stickyInterval: true,
        isLive: true,
      },
    });

    isInitDone.current = true;
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
      activeFilters.current = filterByAuthor(followingUserIds);
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
          showFollowing={followingUserIds.length > 0}
          showMentions={keypairIsLoaded}
          changeFeed={changeFeed}
        />
      </Box>
      <Events changingView={changingView.current} view={view} />
    </Box>
  );
}
