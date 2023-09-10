import { Box, Heading, Text } from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { useEffect, useState } from "react";
import { UserRecord } from "@nostr-ts/common";
import { User } from "../components/user";

export function BlockedUsersRoute() {
  const [blockedUsers, setBlockedUsers] = useState<UserRecord[]>([]);

  const update = async () => {
    await useNClient
      .getState()
      .getAllUsersBlocked()
      .then((following) => {
        if (following) {
          setBlockedUsers(following);
        }
      });
  };

  useEffect(() => {
    update();
    const updateInterval = setInterval(update, 2000);

    return () => clearInterval(updateInterval);
  }, []);

  return (
    <Box>
      <Heading size="lg">Blocked</Heading>
      {blockedUsers.length > 0 ? (
        <>
          {blockedUsers.map((item) => (
            <Box mb="3" key={item.user.pubkey}>
              <User
                user={item.user}
                key={item.user.pubkey}
                options={{
                  showFollowing: false,
                  showBlock: true,
                  relayUrls: item.relayUrls,
                  isBlocked: true,
                }}
              />
            </Box>
          ))}
        </>
      ) : (
        <>
          <Text>
            Block users to ignore their events. The information is stored in
            your browser and not shared with relays.
          </Text>
          <Text fontWeight="bold">You have not blocked anyone.</Text>
        </>
      )}
    </Box>
  );
}
