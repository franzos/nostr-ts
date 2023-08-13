import { Box, Heading, Text } from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { useEffect, useState } from "react";
import { UserFollowing } from "../components/user";
import { NUserBase } from "@nostr-ts/common";

export function FollowingRoute() {
  const [followingUsers, setFollowingUsers] = useState<NUserBase[]>([]);

  useEffect(() => {
    const load = async () => {
      const following = await useNClient.getState().getAllUsersFollowing();
      if (following) {
        setFollowingUsers(following);
      }
    };

    load();
  }, []);

  return (
    <Box>
      <Heading size="lg">Following</Heading>
      {followingUsers.length > 0 ? (
        <>{followingUsers.map((user) => UserFollowing({ user: user }))}</>
      ) : (
        <>
          <Text>
            Follow users to subscribe to their messages. The subscription is
            stored in your browser and not shared with relays.
          </Text>
          <Text fontWeight="bold">You are not following anyone.</Text>
        </>
      )}
    </Box>
  );
}
