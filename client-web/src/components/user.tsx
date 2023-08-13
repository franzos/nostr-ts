import {
  Flex,
  Avatar,
  Heading,
  Box,
  Text,
  Button,
  Spacer,
  HStack,
} from "@chakra-ui/react";
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

  return (
    <Box
      padding={4}
      marginBottom={2}
      border="1px solid #e1e1e1"
      width="100%"
      key={user.pubkey}
    >
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
          mt={2} // added margin top for some space above the button
        >
          Unfollow
        </Button>
      </HStack>
    </Box>
  );
};
