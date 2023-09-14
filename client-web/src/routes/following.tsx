import { Box, Heading, Text } from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { useEffect, useState } from "react";
import { UserRecord } from "@nostr-ts/common";
import { User } from "../components/user";

export function FollowingUsersRoute() {
  const [followingUsers, setFollowingUsers] = useState<UserRecord[]>([]);

  const update = async () => {
    await useNClient
      .getState()
      .getAllUsersFollowing()
      .then((following) => {
        if (following && following.length > 0) {
          setFollowingUsers(following);
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
      <Heading size="lg">Following</Heading>
      {followingUsers.length > 0 ? (
        <>
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
