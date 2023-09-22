import {
  Box,
  Button,
  ButtonGroup,
  HStack,
  Heading,
  Text,
} from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { useEffect, useState } from "react";
import {
  CLIENT_MESSAGE_TYPE,
  NEVENT_KIND,
  NFilters,
  NewContactList,
  UserRecord,
} from "@nostr-ts/common";
import { User } from "../components/user";

export function FollowingUsersRoute() {
  const [publicKey, status] = useNClient((state) => [
    state.keypair.publicKey,
    state.status,
  ]);
  const [followingUsers, setFollowingUsers] = useState<UserRecord[]>([]);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  const update = async () => {
    await useNClient
      .getState()
      .getAllUsersFollowing()
      .then((following) => {
        if (following && following.length > 0) {
          setFollowingUsers(following);
        }
      });
    if (!publicKey) {
      return;
    }
    await useNClient
      .getState()
      .lastContactsUpdate(publicKey)
      .then((createdAt) => {
        if (createdAt) {
          setLastUpdate(createdAt);
        }
      });
  };

  const loadContacts = async () => {
    await useNClient.getState().subscribe({
      type: CLIENT_MESSAGE_TYPE.REQ,
      filters: new NFilters({
        kinds: [NEVENT_KIND.CONTACTS],
        authors: [publicKey],
      }),
      options: {
        timeoutIn: 10000,
      },
    });
  };

  const publish = async () => {
    const ev = NewContactList({
      contacts: followingUsers.map((item) => {
        return {
          key: item.user.pubkey,
          relayUrls: item.relayUrls,
        };
      }),
    });
    await useNClient.getState().signAndSendEvent({
      event: ev,
    });
  };

  useEffect(() => {
    update();
    const updateInterval = setInterval(update, 2000);

    return () => clearInterval(updateInterval);
  }, []);

  return (
    <Box>
      <Heading size="lg">Following</Heading>
      {followingUsers.length > 0 ? (
        <>
          <Text maxWidth="800px">
            You may decide not to publish the people you follow, but you won't
            be able to access this list from other devices, and it will be lost
            if you clear your browser data. Note: Load overwrites local data.
          </Text>
          <HStack mt={2} mb={2}>
            <ButtonGroup>
              <Button
                onClick={loadContacts}
                isDisabled={!publicKey && status === "online"}
              >
                Load
              </Button>
              <Button
                onClick={publish}
                isDisabled={!publicKey && status === "online"}
              >
                Publish
              </Button>
            </ButtonGroup>
            <Text>
              Last published:{" "}
              {lastUpdate
                ? new Date(lastUpdate * 1000).toLocaleString()
                : "never"}
            </Text>
          </HStack>
          {followingUsers.map((item) => (
            <Box mb="3" key={item.user.pubkey}>
              <User
                user={item.user}
                key={item.user.pubkey}
                options={{
                  showFollowing: true,
                  relayUrls: item.relayUrls,
                }}
              />
            </Box>
          ))}
        </>
      ) : (
        <>
          <Text>
            Follow users to subscribe to their messages. The information is
            stored in your browser and not shared with relays.
          </Text>
          <Text fontWeight="bold">You are not following anyone.</Text>
        </>
      )}
    </Box>
  );
}
