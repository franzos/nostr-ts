import { Heading, Box, Text, Grid } from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { CreateEventForm } from "../components/create-event-form";
import { EventsFeeds } from "../components/feeds";

export function WelcomeRoute() {
  const [connected] = useNClient((state) => [state.connected]);

  return (
    <Grid templateColumns={["1fr", "2fr 1fr"]} gap={20}>
      <Box>
        {connected ? (
          <EventsFeeds />
        ) : (
          <Box maxWidth={600}>
            <Heading size="lg">About Nostr</Heading>
            <Text marginBottom={2} fontWeight="bold">
              Tldr: Nostr is a decentralized social network.
            </Text>
            <Text marginBottom={4}>
              Nostr is anything you can imagine. A new reddit, Twitter,
              Facebook, Mastodon - Craigstslist or Ebay? It's only a matter of
              what the interface looks like, the underlying network is the same,
              and so is your identity - so you get to access it all, without
              giving up yourself.
            </Text>
            <Heading size="md">Connect to get started</Heading>
            <Text marginBottom={2}>
              You don't need an account to browse or follow users. All data is
              saved in your browser. To interact with events, generate or supply
              a keypair.
            </Text>
            <Text>nos2x and nos2x-fox should be working too.</Text>
          </Box>
        )}
      </Box>
      <Box display="flex" flexDirection="column">
        <Heading as="h2" size="md" marginBottom={4}>
          Broadcast to the Network
        </Heading>
        <CreateEventForm />
      </Box>
    </Grid>
  );
}
