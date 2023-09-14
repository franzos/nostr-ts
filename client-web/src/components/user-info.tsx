import {
  Avatar,
  Spacer,
  Button,
  Box,
  Image,
  Text,
  HStack,
  useDisclosure,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { useNClient } from "../state/client";
import { UserInfoProps } from "../lib/user-properties";
import { BECH32_PREFIX, encodeBech32 } from "@nostr-ts/common";
import { ListAssignmentModal } from "./list-assignment-modal";

export function UserInfo({
  user: { pubkey, data },
  opts: {
    showAbout,
    showBanner,
    following,
    showFollowing,
    showBlock,
    relayUrls,
    isBlocked,
  },
}: UserInfoProps) {
  const name = data && data.name ? data.name : "Anonymous";
  const displayName = data && data.display_name ? data.display_name : "";
  const picture = data && data.picture ? data.picture : "";
  const banner = data && data.banner ? data.banner : undefined;
  const about = data && data.about ? data.about : undefined;

  const displayNameEqName = displayName === name;

  // const mentionsLink = `/mentions/${user.pubkey}?relays=${relayUrls.join(",")}`;

  const npub = encodeBech32(BECH32_PREFIX.PublicKeys, [
    {
      type: 0,
      value: pubkey,
    },
  ]);

  const profileLink = `/p/${npub}`;

  const { isOpen, onOpen, onClose } = useDisclosure();

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
        <Box overflowWrap="anywhere" maxWidth={350}>
          <Link to={profileLink}>
            <Text size="sm">{name}</Text>
          </Link>
          {!displayNameEqName && <Text size="xs">{displayName}</Text>}
        </Box>

        <Spacer />
        {showBlock && (
          <Button
            variant="outline"
            size={"sm"}
            onClick={() =>
              isBlocked
                ? useNClient.getState().unblockUser(pubkey)
                : useNClient.getState().blockUser({
                    pubkey: pubkey,
                    relayUrls,
                  })
            }
          >
            {isBlocked ? "Unblock" : "Block"}
          </Button>
        )}
        <Button variant="outline" size={"sm"} onClick={onOpen}>
          Lists
        </Button>
        {showFollowing && (
          <Button
            variant="outline"
            size={"sm"}
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
      <Box overflowWrap="anywhere" mt={2}>
        {showAbout && about && <Text fontSize="sm">{about}</Text>}
      </Box>
      <ListAssignmentModal pubkey={pubkey} isOpen={isOpen} onClose={onClose} />
    </>
  );
}
