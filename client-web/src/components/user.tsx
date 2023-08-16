import {
  Flex,
  Avatar,
  Heading,
  Box,
  Text,
  Button,
  Spacer,
} from "@chakra-ui/react";
import { UserBase } from "@nostr-ts/common";
import { useNClient } from "../state/client";

export function User({ user }: { user: UserBase }) {
  const [following] = useNClient((state) => [
    state.followingUserIds.find((f) => f === user.pubkey),
  ]);

  const data = user.data ? user.data : null;
  const display_name =
    data && data.display_name ? data.display_name : "Anonymous";
  const name = data && data.name ? data.name : "Anonymous";
  const picture =
    data && data.picture ? data.picture : "https://via.placeholder.com/150";

  return (
    <Flex>
      <Box mr="3">
        <Avatar size="sm" src={picture} />
      </Box>
      <Box>
        <Heading size="sm">{display_name}</Heading>
        <Text fontSize="sm">{name}</Text>
      </Box>
      <Spacer />
      {following ? (
        <Button
          variant="outline"
          colorScheme="red"
          onClick={() => useNClient.getState().unfollowUser(user.pubkey)}
        >
          Unfollow
        </Button>
      ) : (
        <Button
          variant="outline"
          colorScheme="green"
          onClick={() => useNClient.getState().followUser(user.pubkey)}
        >
          Follow
        </Button>
      )}
    </Flex>
  );
}
