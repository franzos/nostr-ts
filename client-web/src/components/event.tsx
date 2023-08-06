import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Heading,
  Text,
  Button,
  Flex,
  Box,
  Avatar,
} from "@chakra-ui/react";
import { NEventWithUserBase, UserBase } from "@nostr-ts/common";

const unixTimeToRelative = (time: number) => {
  const now = new Date();
  const then = new Date(time * 1000);
  const diff = now.getTime() - then.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) {
    return `${seconds} seconds ago`;
  } else if (minutes < 60) {
    return `${minutes} minutes ago`;
  } else if (hours < 24) {
    return `${hours} hours ago`;
  } else {
    return `${then.toLocaleDateString()} ${then.toLocaleTimeString()}`;
  }
};

const UserKnown = ({ user }: { user: UserBase }) => {
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

const UserUnknown = ({ pubkey }: { pubkey: string }) => {
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

export function Event({ user, event }: NEventWithUserBase) {
  return (
    <Card borderWidth="1px" borderRadius="lg" overflow="hidden">
      <CardHeader p={4}>
        <Box>
          {user ? (
            <UserKnown user={user} />
          ) : (
            <UserUnknown pubkey={event.pubkey} />
          )}
        </Box>
      </CardHeader>
      <CardBody p={4}>
        <Text>{event.content}</Text>
        <Text>{unixTimeToRelative(event.created_at)}</Text>
      </CardBody>
      <CardFooter p={4}>
        <Button variant="solid" colorScheme="blue">
          Reply
        </Button>
      </CardFooter>
    </Card>
  );
}
