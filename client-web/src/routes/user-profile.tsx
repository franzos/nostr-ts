import { UserProfileForm } from "../components/user-profile-form";
import { useNClient } from "../state/client";
import { useEffect } from "react";
import { User } from "../components/user";
import { Box, Text, Button, useToast, Heading } from "@chakra-ui/react";

export function UserProfileRoute() {
  const [pubkey, isOnline, activeUser] = useNClient((state) => [
    state.keypair?.publicKey || "",
    state.connected,
    state.activeUser,
  ]);

  const toast = useToast();

  const init = async () => {
    await useNClient.getState().getAndSetActiveUser({
      retry: true,
    });
  };

  const refreshData = async () => {
    await useNClient.getState().getAndSetActiveUser({
      retry: false,
      updateFromRelays: true,
    });
    toast({
      title: "Refreshing ...",
      description: "Requesting information from the network.",
      status: "info",
      duration: 5000,
      isClosable: true,
    });
  };

  useEffect(() => {
    const timeout = setInterval(() => {
      init();
    }, 1000);

    return () => {
      clearInterval(timeout);
    };
  }, []);

  return (
    <Box>
      {activeUser ? (
        <User
          user={activeUser}
          opts={{
            relayUrls: [],
          }}
        />
      ) : (
        <>
          <Text>
            "No user data found yet. Did you publish your profile to one of the
            connected relays?".
          </Text>
          {isOnline && <Button onClick={refreshData}>Try again</Button>}
        </>
      )}

      <Heading as="h2" size="lg" mb={4} mt={4}>
        Update your profile
      </Heading>
      <UserProfileForm
        props={{
          pubkey,
          metadata: activeUser?.data,
        }}
      />
    </Box>
  );
}
