import { HStack, Spacer, Button, Box } from "@chakra-ui/react";
import { UserBase } from "@nostr-ts/common";
import { useNClient } from "../state/client";
import { UserKnown, UserUnknown } from "./user";

export function UserFollowing({ user }: { user: UserBase }) {
  const data = user.data ? user.data : null;

  return (
    <Box padding={4} marginBottom={2} border="1px solid #e1e1e1" width="100%">
      <HStack spacing={2}>
        {data ? (
          <UserKnown user={user} />
        ) : (
          <UserUnknown pubkey={user.pubkey} />
        )}

        <Spacer />
        <Button
          variant="solid"
          colorScheme="red"
          size={"xs"}
          onClick={() => useNClient.getState().unfollowUser(user.pubkey)}
          mt={2}
        >
          Unfollow
        </Button>
      </HStack>
    </Box>
  );
}
