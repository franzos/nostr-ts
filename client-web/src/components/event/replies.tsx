import { LightProcessedEvent } from "@nostr-ts/common";
import { CreateEventForm } from "../create-event-form";
import { Event } from "../event";
import { Box } from "@chakra-ui/react";

interface EventRepliesProps {
  data: LightProcessedEvent;
  replies: LightProcessedEvent[] | undefined;
  isReplyOpen: boolean;
  sendCallback: (eventId: string) => void;
  level: number;
}

export function EventReplies({
  data,
  replies,
  isReplyOpen,
  sendCallback,
  level,
}: EventRepliesProps) {
  return (
    <>
      {isReplyOpen && (
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
        isReplyOpen &&
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
