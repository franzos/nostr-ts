import { NFilters, NEVENT_KIND } from "@nostr-ts/common";
import { Box, Radio, RadioGroup, Stack, Text } from "@chakra-ui/react";
import { useRef, useEffect, useState } from "react";
import { MAX_EVENTS } from "../defaults";
import { useNClient } from "../state/client";
import { Events } from "./events";
import { User } from "./user";

const defaultFilters = new NFilters({
  kinds: [NEVENT_KIND.SHORT_TEXT_NOTE, NEVENT_KIND.LONG_FORM_CONTENT],
  limit: MAX_EVENTS,
});

export function EventsFeeds() {
  const [connected, followingUserIds, keypairIsLoaded, keypair] = useNClient(
    (state) => [
      state.connected,
      state.followingUserIds,
      state.keypairIsLoaded,
      state.keypair,
    ]
  );

  const [lists, setLists] = useState<
    {
      id: string;
      title: string;
    }[]
  >([]);

  const [eventFilters, setEventFilters] = useState<NFilters>(defaultFilters);
  const [activeView, setActiveView] = useState<string>("global");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const initDone = useRef<boolean>(false);
  const init = async () => {
    if (!connected || initDone.current) return;
    initDone.current = true;
    await useNClient.getState().setViewSubscription(activeView, eventFilters, {
      reset: true,
    });
    setIsLoading(false);

    const lists = await useNClient.getState().getAllLists();
    if (lists) {
      setLists(
        lists.map((item) => ({
          id: item.id,
          title: item.title,
        }))
      );
    }
  };

  /**
   * Handle initial load
   */
  useEffect(() => {
    init();
  }, []);

  /**
   * Handle the connection status change
   */
  useEffect(() => {
    setTimeout(() => {
      init();
    }, 500);
  }, [connected]);

  const changeFeed = async (feedName: string) => {
    if (!connected) return;
    setIsLoading(true);

    let filters: NFilters;
    if (feedName === "global") {
      setActiveView(feedName);
      filters = new NFilters({
        kinds: [NEVENT_KIND.SHORT_TEXT_NOTE, NEVENT_KIND.LONG_FORM_CONTENT],
        limit: MAX_EVENTS,
      });
      setEventFilters(filters);
    } else if (feedName === "following") {
      setActiveView(feedName);
      filters = new NFilters({
        kinds: [NEVENT_KIND.SHORT_TEXT_NOTE, NEVENT_KIND.LONG_FORM_CONTENT],
        authors: followingUserIds,
      });
      setEventFilters(filters);
    } else if (feedName === "mentions") {
      setActiveView(feedName);
      filters = new NFilters({
        kinds: [
          NEVENT_KIND.SHORT_TEXT_NOTE,
          NEVENT_KIND.LONG_FORM_CONTENT,
          NEVENT_KIND.REPOST,
        ],
        limit: MAX_EVENTS,
        "#p": [keypair.publicKey],
      });
      setEventFilters(filters);
    } else if (lists && lists.length > 0) {
      const list = lists.find((item) => item.id === feedName);
      if (list) {
        const listRecord = await useNClient.getState().getList(list.id);
        if (!listRecord || !listRecord.userPubkeys) return;
        setActiveView(feedName);
        filters = new NFilters({
          kinds: [NEVENT_KIND.SHORT_TEXT_NOTE, NEVENT_KIND.LONG_FORM_CONTENT],
          limit: MAX_EVENTS,
          authors: listRecord?.userPubkeys,
        });
        setEventFilters(filters);
      } else {
        console.log("list not found");
        return;
      }
    } else {
      console.log("list not found");
      return;
    }
    console.log(filters);
    await useNClient.getState().setViewSubscription(feedName, filters, {
      reset: true,
    });
    setIsLoading(false);
  };

  return (
    <Box>
      <RadioGroup onChange={changeFeed} value={activeView}>
        <Stack direction="row">
          <Radio value="global">Global</Radio>
          {followingUserIds.length > 0 && (
            <Radio value="following">Following</Radio>
          )}
          {keypairIsLoaded && <Radio value="mentions">Mentions</Radio>}
          {lists &&
            lists.length > 0 &&
            lists.map((list) => (
              <Radio key={list.id} value={list.id}>
                {list.title}
              </Radio>
            ))}
        </Stack>
      </RadioGroup>
      <Box overflowY="auto">
        {!isLoading ? (
          <Events
            userComponent={User}
            view="welcome"
            filters={eventFilters}
            connected={connected}
            lists={lists}
          />
        ) : (
          <Box marginTop={5} marginBottom={5} textAlign={"center"}>
            <Text>Changing feed ...</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
