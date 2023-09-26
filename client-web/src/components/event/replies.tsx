import { LightProcessedEvent } from "@nostr-ts/common";
import { CreateEventForm } from "../create-event-form";
import { Event } from "../event";
import { Box } from "@chakra-ui/react";
import { useNClient } from "../../state/client";
import { useEffect, useState } from "react";
import { Loading } from "../loading";

interface EventRepliesProps {
  data: LightProcessedEvent;
  isOpen: boolean;
  sendCallback: (eventId: string) => void;
  level: number;
}

export function EventReplies({
  data,
  isOpen,
  sendCallback,
  level,
}: EventRepliesProps) {
  const view = `event-${data.event.id}_replies`;
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [replies] = useNClient((state) => [
    state.events[`event-${data.event.id}_replies`],
  ]);

  const loadReplies = async () => {
    setIsLoading(true);
    try {
      await useNClient.getState().getEventReplies(data.event.id, view, true);
    } catch (e) {
      console.error(e);
    }

    if (replies && replies.length > 0) {
      await useNClient.getState().requestInformation(
        {
          source: "events:related",
          idsOrKeys: [...replies.map((r) => r.event.id)],
        },
        {
          timeoutIn: 20000,
          view,
          isLive: true,
        }
      );
      let pubkeys = replies.map((r) => r.event.pubkey);
      pubkeys = [...new Set(pubkeys)];
      await useNClient.getState().requestInformation(
        {
          source: "users",
          idsOrKeys: [...pubkeys],
        },
        {
          timeoutIn: 10000,
          view,
          isLive: true,
        }
      );
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadReplies();
    }
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <Box
          padding={4}
          marginBottom={2}
          marginTop={2}
          background="background"
          borderRadius={4}
        >
          <CreateEventForm
            isResponse={true}
            inResponseTo={data.event}
            relayUrls={data.eventRelayUrls}
            kind="NewShortTextNoteResponse"
            sendCallback={sendCallback}
          />
        </Box>
      )}

      {replies &&
        isOpen &&
        replies.map((r) => {
          const user = r.user ? r.user : { pubkey: r.event.pubkey };
          return (
            <Box
              key={`${r.event.id}_${user.pubkey}_replies`}
              marginLeft={10}
              mb={1}
            >
              <Event data={r} level={level + 1} />
            </Box>
          );
        })}

      {isLoading && isOpen && (
        <Loading text="Just a sec ... Loading replies." />
      )}
    </>
  );
}
