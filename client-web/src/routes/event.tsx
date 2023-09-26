import { Heading, Box, Grid } from "@chakra-ui/react";
import { decodeBech32 } from "@nostr-ts/common";
import { useState, useEffect, useRef } from "react";
import { useNClient } from "../state/client";
import { useParams } from "react-router-dom";
import { Event } from "../components/event";
import { Loading } from "../components/loading";

export function EventRoute() {
  const [connected] = useNClient((state) => [state.connected]);

  const isInitDone = useRef<boolean>(false);

  const eventId = useRef("");
  const relayUrls = useRef<string[]>([]);
  const eventLoadTimeout = useRef<number | null>(null);
  const [hasTimeout, setHasTimeout] = useState<boolean>(false);

  // URL params
  const { note } = useParams();

  const view = `event-${note}`;

  const [eventData] = useNClient((state) => [
    state.events[view] ? state.events[view][0] : null,
  ]);

  const getEvent = async (retryCount = 0) => {
    await useNClient
      .getState()
      .getEvent(eventId.current, {
        view,
        retryCount,
        relayUrls: relayUrls.current,
      })
      .then((r) => {
        if (!r) {
          console.log(`Could not get event. Retrying...`);
          eventLoadTimeout.current = setTimeout(async () => {
            if (retryCount > 20) {
              setHasTimeout(true);
              if (eventLoadTimeout.current) {
                clearTimeout(eventLoadTimeout.current);
              }
              return;
            }
            await getEvent(retryCount + 1);
          }, 1000);
        }
      });
  };

  const onMount = async (nprofileString: string) => {
    if (!useNClient.getState().connected || isInitDone.current) return;
    isInitDone.current = true;
    try {
      const decoded = decodeBech32(nprofileString);
      for (const item of decoded.tlvItems) {
        if (item.type === 0) {
          eventId.current = item.value as string;
          break;
        } else if (item.type === 1) {
          relayUrls.current.push(item.value as string);
        }
      }
    } catch (e) {
      console.log(e);
      return;
    }
    await getEvent();
  };

  useEffect(() => {
    if (note) {
      onMount(note);
    }
    return () => {
      if (eventLoadTimeout.current) {
        clearTimeout(eventLoadTimeout.current);
      }
      useNClient.getState().unsubscribeByToken(view);
    };
  }, []);

  useEffect(() => {
    if (connected) {
      if (note) {
        onMount(note);
      }
    }
  }, [connected]);

  return (
    <Grid templateColumns={["1fr", "2fr 1fr"]} gap={20}>
      <Box>
        {eventData ? (
          <Box mb={4}>
            <Event data={eventData} level={0} />
          </Box>
        ) : (
          <>
            {hasTimeout ? (
              <Heading as="h2" size="md" marginBottom={4}>
                It looks like the event is not available on any of the connected
                relays.
              </Heading>
            ) : (
              <Loading text="Just a sec ... Searching the Matrix for the event." />
            )}
          </>
        )}
      </Box>

      <Box display="flex" flexDirection="column"></Box>
    </Grid>
  );
}
