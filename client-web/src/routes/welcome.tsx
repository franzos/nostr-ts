import { Heading, Box, Text } from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { Events } from "../components/events";

export function WelcomeRoute() {
  const [connected] = useNClient((state) => [state.connected]);

  return (
    <Box>
      {connected ? (
        <Events />
      ) : (
        <Box maxWidth={600}>
          <Heading size="lg">Connect to get started</Heading>
          <Text>
            You don't need an account to browse or follow users. All data is
            saved in your browser. To interact with events, generate or supply a
            keypair.
          </Text>
        </Box>
      )}
    </Box>
  );
}
