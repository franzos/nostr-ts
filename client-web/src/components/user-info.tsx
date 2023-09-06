import {
  Avatar,
  Spacer,
  Button,
  Box,
  Image,
  Text,
  HStack,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { useNClient } from "../state/client";
import { UserInfoProps } from "../lib/user-properties";

export function UserInfo({
  user: { pubkey, data },
  opts: { showAbout, showBanner, following, showFollowing, relayUrls },
}: UserInfoProps) {
  const name = data && data.name ? data.name : "Anonymous";
  const displayName = data && data.display_name ? data.display_name : "";
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
      <HStack>
        <Box mr="2">
          <Link to={profileLink}>
            <Avatar size="xs" src={picture} />
          </Link>
        </Box>

        <Link to={profileLink}>
          <Text size="sm">{name}</Text>
        </Link>
        <Text size="xs">{displayName}</Text>
        <Box overflowWrap="anywhere">
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
      </HStack>
    </>
  );
}
