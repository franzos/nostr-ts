import { LightProcessedEvent } from "@nostr-ts/common";
import { CreateEventForm } from "../create-event-form";
import { Event } from "../event";
import { Box } from "@chakra-ui/react";
import { useNClient } from "../../state/client";
import { useEffect } from "react";

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

  const [replies] = useNClient((state) => [
    state.events[`event-${data.event.id}_replies`],
  ]);

  const loadReplies = async () => {
    await useNClient.getState().getEventReplies(data.event.id, view, true);
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
    </>
  );
}
