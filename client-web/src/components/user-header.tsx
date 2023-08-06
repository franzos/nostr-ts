import { Flex, Avatar, Heading, Box, Text, Button } from "@chakra-ui/react";
import { UserBase } from "@nostr-ts/common";
import { useNClient } from "../state/client";

export const UserKnown = ({ user }: { user: UserBase }) => {
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
    </Flex>
  );
};

export const UserUnknown = ({ pubkey }: { pubkey: string }) => {
  return (
    <Flex>
      <Box mr="3">
        <Avatar size="sm" src="https://via.placeholder.com/150" />
      </Box>
      <Box>
        <Heading size="sm">Anonymous</Heading>
        <Text fontSize="sm">{pubkey}</Text>
      </Box>
    </Flex>
  );
};

export const UserFollowing = ({ user }: { user: UserBase }) => {
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
        <Text fontSize="xs" color="gray.300">
          {user.pubkey}
        </Text>
        <Button
          variant="solid"
          colorScheme="red"
          size={"xs"}
          onClick={() => useNClient.getState().unfollowUser(user.pubkey)}
        >
          Unfollow
        </Button>
      </Box>
    </Flex>
  );
};
