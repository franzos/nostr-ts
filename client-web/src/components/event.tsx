import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Text,
  Button,
  Box,
} from "@chakra-ui/react";
import { NEventWithUserBase } from "@nostr-ts/common";
import { useNClient } from "../state/client";
import { UserKnown, UserUnknown } from "./user-header";
import { useEffect, useState } from "react";

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

export function Event({ user, event }: NEventWithUserBase) {
  const [following, setFollowing] = useState<boolean>(false);

  useEffect(() => {
    const update = async () => {
      const following = await useNClient.getState().followingUser(event.pubkey);
      setFollowing(following);
    };
    update();
  }, [event.pubkey]);

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
        <Text fontWeight="bold" marginTop={2}>
          {unixTimeToRelative(event.created_at)}
        </Text>
      </CardBody>
      <CardFooter p={4}>
        <Button variant="solid" colorScheme="blue" marginRight={2}>
          Reply
        </Button>
        {following ? (
          <Button
            variant="solid"
            colorScheme="red"
            onClick={() => useNClient.getState().unfollowUser(event.pubkey)}
          >
            Unfollow
          </Button>
        ) : (
          <Button
            variant="solid"
            colorScheme="green"
            onClick={() => useNClient.getState().followUser(event.pubkey)}
          >
            Follow
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
