import { Heading, Box, Text } from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { Events } from "../components/events";
import { useEffect } from "react";
import { NFilters, NEVENT_KIND } from "@nostr-ts/common";
import { User } from "../components/user";

export function WelcomeRoute() {
  const [connected] = useNClient((state) => [state.connected]);

  useEffect(() => {
    if (connected) {
      const subscriptions = useNClient.getState().subscriptions();
      if (subscriptions.length === 0) {
        // If there are no subscriptions, setup a default one.
        useNClient.getState().subscribe(
          new NFilters({
            limit: 10,
            kinds: [NEVENT_KIND.SHORT_TEXT_NOTE, NEVENT_KIND.LONG_FORM_CONTENT],
          })
        );
      }
    }
  }, [connected]);

  return (
    <Box>
      {connected ? (
        <Events userComponent={User} />
      ) : (
        <Box maxWidth={600}>
          <Heading size="lg">About Nostr</Heading>
          <Text marginBottom={2} fontWeight="bold">
            Tldr: Nostr is a decentralized social network.
          </Text>
          <Text marginBottom={4}>
            Nostr is anything you can imagine. A new reddit, Twitter, Facebook,
            Mastodon - Craigstslist or Ebay? It's only a matter of what the
            interface looks like, the underlying network is the same, and so is
            your identity - so you get to access it all, without giving up
            yourself.
          </Text>
          <Heading size="lg">Connect to get started</Heading>
          <Text marginBottom={2}>
            You don't need an account to browse or follow users. All data is
            saved in your browser. To interact with events, generate or supply a
            keypair.
          </Text>
        </Box>
      )}
    </Box>
  );
}
