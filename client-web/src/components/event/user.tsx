import { LightProcessedEvent } from "@nostr-ts/common";
import { User } from "../user";

interface EventUserProps {
  data: LightProcessedEvent;
}

export function EventUser({ data }: EventUserProps) {
  return (
    <>
      {data.user && data.user.pubkey ? (
        <User
          user={data.user}
          options={{
            showFollowing: true,
            relayUrls: data.eventRelayUrls,
            showBlock: true,
          }}
        />
      ) : (
        <User
          user={{
            pubkey: data.event.pubkey,
          }}
          options={{
            showFollowing: true,
            relayUrls: data.eventRelayUrls,
            showBlock: true,
          }}
        />
      )}
    </>
  );
}
