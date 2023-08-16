import { Box } from "@chakra-ui/react";
import { UserBase } from "@nostr-ts/common";
import { User } from "./user";

export function UserFollowing({ user }: { user: UserBase }) {
  const data = user.data ? user.data : null;

  return (
    <Box padding={4} marginBottom={2} border="1px solid #e1e1e1" width="100%">
      {data ? (
        <User user={user} />
      ) : (
        <User
          user={{
            pubkey: user.pubkey,
          }}
        />
      )}
    </Box>
  );
}
