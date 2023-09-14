import { Heading, Box, Image, Grid } from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { CreateEventForm } from "../components/create-event-form";
import { EventsFeeds } from "../components/feeds";
import Logo from "../assets/logo.svg";
import { PopularUsersList } from "../components/popular-users";

export function WelcomeRoute() {
  const [connected] = useNClient((state) => [state.connected]);

  return (
    <Grid templateColumns={["1fr", "2fr 1fr"]} gap={20}>
      <Box>
        <EventsFeeds />

        {!connected && <Image src={Logo} />}
      </Box>
      <Box display="flex" flexDirection="column">
        <Heading as="h2" size="md" marginBottom={4}>
          Broadcast to the Network
        </Heading>
        <CreateEventForm />
        <Box mt={4}>
          <PopularUsersList />
        </Box>
      </Box>
    </Grid>
  );
}
