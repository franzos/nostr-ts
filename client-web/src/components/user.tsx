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
import { Link } from "react-router-dom";

export function User({
  user,
  relayId,
  hideFollow,
}: {
  user: UserBase;
  relayId: string;
  hideFollow?: boolean;
}) {
  const [following] = useNClient((state) => [
    state.followingUserIds.find((f) => f === user.pubkey),
  ]);

  const data = user.data ? user.data : null;
  const display_name =
    data && data.display_name ? data.display_name : "Anonymous";
  const name = data && data.name ? data.name : "Anonymous";
  const picture = data && data.picture ? data.picture : "/no-image.png";

  const profileLink = `/p/${relayId}/${user.pubkey}`;

  return (
    <Flex>
      <Box mr="3">
        <Avatar size="sm" src={picture} />
      </Box>
      <Box>
        <Link to={profileLink}>
          <Heading size="sm">{display_name}</Heading>
          <Text fontSize="sm">{name}</Text>
        </Link>
      </Box>
      <Spacer />
      {!hideFollow && (
        <Button
          variant="outline"
          colorScheme={following ? "red" : "green"}
          onClick={() =>
            following
              ? useNClient.getState().unfollowUser(user.pubkey)
              : useNClient.getState().followUser({
                  pubkey: user.pubkey,
                  relayId,
                })
          }
        >
          {following ? "Unfollow" : "Follow"}
        </Button>
      )}
    </Flex>
  );
}
