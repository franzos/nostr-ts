import {
  Flex,
  Avatar,
  Heading,
  Spacer,
  Button,
  Box,
  Image,
  Text,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { useNClient } from "../state/client";
import { UserInfoProps } from "../lib/user-properties";

export function UserInfo({
  user: { pubkey, data },
  opts: { showAbout, showBanner, following, showFollowing, relayUrls },
}: UserInfoProps) {
  const name = data && data.name ? data.name : "Anonymous";
  const displayName =
    data && data.display_name ? data.display_name : "Anonymous";
  const picture = data && data.picture ? data.picture : "";
  const banner = data && data.banner ? data.banner : undefined;
  const about = data && data.about ? data.about : undefined;

  const profileLink = `/p/${pubkey}?relays=${relayUrls.join(",")}`;
  // const mentionsLink = `/mentions/${user.pubkey}?relays=${relayUrls.join(",")}`;

  return (
    <>
      {showBanner && banner && (
        <Box marginBottom={2}>
          <Image src={banner} alt="banner" />
        </Box>
      )}
      <Flex>
        <Box mr="3">
          <Link to={profileLink}>
            <Avatar size="sm" src={picture} />
          </Link>
        </Box>
        <Box overflowWrap="anywhere">
          <Link to={profileLink}>
            <Heading size="sm">{displayName}</Heading>
            <Text fontSize="sm">{name}</Text>
          </Link>
          {showAbout && about && <Text fontSize="sm">{about}</Text>}
        </Box>
        <Spacer />
        {showFollowing && (
          <Button
            variant="outline"
            colorScheme={following ? "red" : "green"}
            onClick={() =>
              following
                ? useNClient.getState().unfollowUser(pubkey)
                : useNClient.getState().followUser({
                    pubkey: pubkey,
                    relayUrls,
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
