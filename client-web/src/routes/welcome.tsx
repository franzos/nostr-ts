import { Heading, Box, Text } from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { Events } from "../components/events";
import { useEffect, useState } from "react";
import { NFilters, NEVENT_KIND } from "@nostr-ts/common";
import { User } from "../components/user";

export function WelcomeRoute() {
  const [connected] = useNClient((state) => [state.connected]);
  const [eventsEqualOrMoreThanMax] = useNClient((state) => [
    state.maxEvents === state.events.length,
  ]);

  const defaultFilters = new NFilters({
    kinds: [NEVENT_KIND.SHORT_TEXT_NOTE, NEVENT_KIND.LONG_FORM_CONTENT],
  });

  const [initDone, setInitDone] = useState(false);

  /**
   * Handle the connection status change
   */
  useEffect(() => {
    const init = async () => {
      if (!connected || initDone) return;
      setInitDone(true);
      await useNClient
        .getState()
        .setViewSubscription("welcome", defaultFilters);
    };
    init();
  }, [connected]);

  /**
   * Handle initial load
   */
  useEffect(() => {
    const init = async () => {
      if (!connected || initDone) return;
      setInitDone(true);
      await useNClient.getState().clearEvents();
      await useNClient
        .getState()
        .setViewSubscription("welcome", defaultFilters);
    };
    init();
  }, []);

  /**
   * Remove subscription when we hit the limit
   */
  useEffect(() => {
    const remove = async () => {
      if (!connected) return;
      await useNClient.getState().removeViewSubscription("welcome");
    };

    if (eventsEqualOrMoreThanMax) {
      console.log(
        "removing subscription < =================================================="
      );
      remove();
    }
  }, [eventsEqualOrMoreThanMax]);

  return (
    <Box>
      {connected ? (
        <Events
          userComponent={User}
          view="welcome"
          filters={defaultFilters}
          connected={connected}
        />
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
          <Heading size="md">Connect to get started</Heading>
          <Text marginBottom={2}>
            You don't need an account to browse or follow users. All data is
            saved in your browser. To interact with events, generate or supply a
            keypair.
          </Text>
          <Text>nos2x and nos2x-fox should be working too.</Text>
        </Box>
      )}
    </Box>
  );
}
