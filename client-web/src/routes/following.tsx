import { Box, Heading, Text } from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { useEffect, useRef, useState } from "react";
import { NUserBase } from "@nostr-ts/common";
import { User } from "../components/user";

export function FollowingRoute() {
  const [followingUsers, setFollowingUsers] = useState<
    {
      user: NUserBase;
      relayIds: string[];
    }[]
  >([]);

  const initDone = useRef<boolean>(false);

  useEffect(() => {
    const init = async () => {
      if (initDone.current) return;
      initDone.current = true;
      const following = await useNClient.getState().getAllUsersFollowing();
      if (following) {
        setFollowingUsers(following);
      }
    };
    init();
  }, []);

  return (
    <Box>
      <Heading size="lg">Following</Heading>
      {followingUsers.length > 0 ? (
        <>
          {followingUsers.map((item) => (
            <Box mb="3">
              <User
                user={item.user}
                key={item.user.pubkey}
                relayId={item.relayIds[0]}
              />
            </Box>
          ))}
        </>
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
