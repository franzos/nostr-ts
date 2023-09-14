import { Box, Heading } from "@chakra-ui/react";
import { UserRecord } from "@nostr-ts/common";
import { useEffect, useState } from "react";
import { UserInfo } from "./user-info";
import { useNClient } from "../state/client";

export function PopularUsersList() {
  const [users, setUsers] = useState<UserRecord[]>([]);

  const onMount = async () => {
    const users = await useNClient.getState().getPopularUsers();
    if (users) {
      setUsers(users);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      onMount();
    }, 100);
    const interval = setInterval(() => {
      onMount();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box>
      <Heading as="h2" size="md" marginBottom={4}>
        Hot right now
      </Heading>
      {users.map((user, index) => (
        <UserInfo
          key={index}
          user={user.user}
          opts={{
            showAbout: false,
            showBanner: false,
            following: false,
            showFollowing: false,
            showBlock: false,
            relayUrls: [],
            isBlocked: false,
          }}
        />
      ))}
    </Box>
  );
}
