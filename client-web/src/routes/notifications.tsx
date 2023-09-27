import { Box, Grid } from "@chakra-ui/react";
import { useEffect } from "react";
import { useNClient } from "../state/client";
import { Events } from "../components/events";
import { filterByMentions } from "../lib/default-filters";

export function NotificationsRoute() {
  const [status, pubKey] = useNClient((state) => [
    state.status,
    state.keypair ? state.keypair.publicKey : undefined,
  ]);

  const view = `notifications-${pubKey}`;

  const loadEvents = async (pubKey: string) => {
    await useNClient.getState().getEvents({
      token: view,
      query: {
        direction: "OLDER",
        filters: filterByMentions([pubKey]),
        stickyInterval: true,
        isLive: true,
      },
    });
  };

  useEffect(() => {
    return () => {
      useNClient.getState().unsubscribeByToken(view);
    };
  }, []);

  useEffect(() => {
    if (
      ["online", "offline"].includes(useNClient.getState().status) &&
      pubKey
    ) {
      loadEvents(pubKey);
    }
  }, [status, pubKey]);

  return (
    <Grid templateColumns={["1fr", "2fr 1fr"]} gap={20}>
      <Box>
        <Events view={view} />
      </Box>

      <Box display="flex" flexDirection="column"></Box>
    </Grid>
  );
}
