import {
  CLIENT_MESSAGE_TYPE,
  NEVENT_KIND,
  NFilters,
  UserBase,
} from "@nostr-ts/common";
import { UserProfileForm } from "../components/user-profile-form";
import { useNClient } from "../state/client";
import { useEffect, useState } from "react";
import { User } from "../components/user";
import { Box, Text, Button, useToast, Heading } from "@chakra-ui/react";

export function UserProfileRoute() {
  const [pubkey, isOnline] = useNClient((state) => [
    state.keypair?.publicKey || "",
    state.connected,
  ]);
  const [user, setUser] = useState<UserBase | null>(null);
  const [relayUrls, setrelayUrls] = useState<string[]>([]);

  const toast = useToast();

  const init = async () => {
    if (!pubkey || pubkey === "") return;
    const userRecord = await useNClient.getState().getUser(pubkey);
    if (userRecord) {
      setUser(userRecord.user);
      setrelayUrls(userRecord.relayUrls);
    }
  };

  const refreshData = async () => {
    if (!pubkey || pubkey === "") {
      toast({
        title: "Not found",
        description:
          "No user data found yet. Did you publish your profile to one of the connected relays?",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    await useNClient.getState().subscribe({
      type: CLIENT_MESSAGE_TYPE.REQ,
      filters: new NFilters({
        authors: [pubkey],
        kinds: [NEVENT_KIND.METADATA],
      }),
      options: {
        timeoutIn: 10000,
        view: "user-profile",
      },
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
      {user ? (
        <User
          user={user}
          options={{
            relayUrls,
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
          metadata: user?.data,
        }}
      />
    </Box>
  );
}
