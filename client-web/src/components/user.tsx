import {
  Flex,
  Avatar,
  Heading,
  Box,
  Text,
  Button,
  Spacer,
  Image,
} from "@chakra-ui/react";
import { UserBase } from "@nostr-ts/common";
import { useNClient } from "../state/client";
import { Link } from "react-router-dom";

export function User({
  user,
  relayIds,
  hideFollow,
  showBanner,
  showAbout,
}: {
  user: UserBase;
  relayIds: string[];
  hideFollow?: boolean;
  showBanner?: boolean;
  showAbout?: boolean;
}) {
  const [following] = useNClient((state) => [
    state.followingUserIds.find((f) => f === user.pubkey),
  ]);

  const data = user.data ? user.data : null;
  const display_name =
    data && data.display_name ? data.display_name : "Anonymous";
  const name = data && data.name ? data.name : "Anonymous";
  const picture = data && data.picture ? data.picture : "/no-image.png";
  const banner = data && data.banner ? data.banner : undefined;
  const about = data && data.about ? data.about : undefined;

  const profileLink = `/p/${user.pubkey}?relays=${relayIds.join(",")}`;
  // const mentionsLink = `/mentions/${user.pubkey}?relays=${relayIds.join(",")}`;

  return (
    <>
      {showBanner && banner && (
        <Box marginBottom={2}>
          <Image src={banner} alt="banner" />
        </Box>
      )}
      <Flex>
        <Box mr="3">
          <Avatar size="sm" src={picture} />
        </Box>
        <Box>
          <Link to={profileLink}>
            <Heading size="sm">{display_name}</Heading>
            <Text fontSize="sm">{name}</Text>
          </Link>
          {showAbout && about && <Text fontSize="sm">{about}</Text>}
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
                    relayIds,
                  })
            }
          >
            {following ? "Unfollow" : "Follow"}
          </Button>
        )}
      </Flex>
    </>
  );
}
