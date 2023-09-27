import { useEffect, useRef, useState } from "react";
import { useNClient } from "../state/client";
import { decodeBech32 } from "@nostr-ts/common";
import { Box, Text } from "@chakra-ui/react";
import { Event } from "./event";

interface OnDemandEventProps {
  note: string;
  index: number;
}

export function OnDemandEvent({ note, index }: OnDemandEventProps) {
  const MAX_RETRIES = 20;
  const RETRY_INTERVAL = 1000;

  const eventId = useRef("");
  const relayUrls = useRef<string[]>([]);

  const [connected] = useNClient((state) => [state.connected]);
  const [eventData] = useNClient((state) => [
    state.events[note] ? state.events[note][0] : null,
  ]);
  const [hasTimeout, setHasTimeout] = useState(false);

  const fetchEvent = async (retryCount = 0) => {
    if (retryCount > MAX_RETRIES) {
      setHasTimeout(true);
      return;
    }

    const event = await useNClient.getState().getEvent(eventId.current, {
      view: note,
      retryCount,
      relayUrls: relayUrls.current,
    });

    if (!event) {
      setTimeout(() => fetchEvent(retryCount + 1), RETRY_INTERVAL);
    }
  };

  useEffect(() => {
    // Decode note
    try {
      const decoded = decodeBech32(note);
      for (const item of decoded.tlvItems) {
        if (item.type === 0) {
          eventId.current = item.value as string;
        } else if (item.type === 1) {
          relayUrls.current.push(item.value as string);
        }
      }
    } catch (e) {
      console.error(e);
      return;
    }

    if (note && connected && (!index || index <= 2)) {
      fetchEvent();
    }

    // return () => {
    //   useNClient.getState().unsubscribeByToken(note);
    // };
  }, [note, index, connected]);

  return (
    <Box p={1} m={1}>
      {eventData ? (
        <Event data={eventData} level={0} />
      ) : hasTimeout ? (
        <Text fontSize="sm" color="gray.500">
          Couldn't find {note}.
        </Text>
      ) : (
        <Text fontSize="sm" color="gray.500">
          Loading ... {note}
        </Text>
      )}
    </Box>
  );
}
