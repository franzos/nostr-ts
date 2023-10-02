import {
  Avatar as ChakraAvatar,
  Spacer,
  Box,
  Image,
  Text,
  HStack,
  useDisclosure,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  IconButton,
  Icon,
  Button,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverTrigger,
  useToast,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { useNClient } from "../state/client";
import { UserInfoProps } from "../lib/user-properties";
import { BECH32_PREFIX, bechEncodePublicKey } from "@nostr-ts/common";
import CancelIcon from "mdi-react/CancelIcon";
import AccountMultipleIcon from "mdi-react/AccountMultipleIcon";
import PlaylistEditIcon from "mdi-react/PlaylistEditIcon";
import DotsVerticalCircleOutlineIcon from "mdi-react/DotsVerticalCircleOutlineIcon";
import ContentCopyIcon from "mdi-react/ContentCopyIcon";
import { ListAssignmentModal } from "./list-assignment-modal";
import { useEffect, useState } from "react";
import Avatar from "boring-avatars";
import { ZapModal } from "./event/zap-modal";
import { QRCodeModal } from "./qrcode";
import { excerpt } from "../lib/excerpt";
import { toastSuccessContent } from "../lib/toast";

export function User({
  user: { pubkey, data },
  opts: {
    showAbout,
    showBanner,
    showFollowing,
    showBlock,
    showLud,
    relayUrls,
    isBlocked,
  },
}: UserInfoProps) {
  const toast = useToast();

  const name = data && data.name ? data.name : "Anonymous";
  const displayName = data && data.display_name ? data.display_name : name;
  const picture = data && data.picture ? data.picture : "";
  const banner = data && data.banner ? data.banner : undefined;
  const about = data && data.about ? data.about : undefined;
  const lud06 = data && data.lud06 ? data.lud06 : undefined;
  const lud16 = data && data.lud16 ? data.lud16 : undefined;
  // const nip05 = data && data.nip05 ? data.nip05 : undefined;

  const displayNameEqName = displayName === name;

  const [profileLink, setProfileLink] = useState<string>("");
  const [following, setFollowing] = useState<boolean>(false);

  useEffect(() => {
    const npub = bechEncodePublicKey(pubkey);
    setProfileLink(`/p/${npub}`);
  }, [pubkey]);

  const copyUserLinkToClipboard = () => {
    const url = `${window.location.origin}/#${profileLink}`;
    navigator.clipboard.writeText(url);
    toast(toastSuccessContent(`Copied ${excerpt(url, 29)} to clipboard`));
  };

  const copyLud06 = () => {
    if (!lud06) return;
    navigator.clipboard.writeText(lud06);
    toast(toastSuccessContent(`Copied ${excerpt(lud06, 29)} to clipboard`));
  };

  const copyLud16 = () => {
    if (!lud16) return;
    navigator.clipboard.writeText(lud16);
    toast(toastSuccessContent(`Copied ${excerpt(lud16, 29)} to clipboard`));
  };

  const loadFollowingStatus = async () => {
    const following = await useNClient.getState().followingUser(pubkey);
    setFollowing(following);
  };

  // const mentionsLink = `/mentions/${user.pubkey}?relays=${relayUrls.join(",")}`;

  const { isOpen, onOpen, onClose } = useDisclosure();

  // TOOO: Finish implementing this

  const { isOpen: zapModalIsOpen, onClose: onZapModalClose } = useDisclosure();

  const LUDPopover = ({ lud, name }: { lud: string; name: string }) => {
    return (
      <Popover>
        <PopoverTrigger>
          <Button size="xs" variant="outline" color="gray.500">
            {name}
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <PopoverArrow />
          <PopoverCloseButton />
          <PopoverBody>{lud && <Text fontSize={12}>{lud}</Text>}</PopoverBody>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <>
      {showBanner && banner && (
        <Box marginBottom={2}>
          <Image src={banner} alt="banner" />
        </Box>
      )}
      <HStack>
        <Box>
          <Link to={profileLink}>
            {picture === "" ? (
              <Avatar
                size={24}
                name={pubkey}
                variant="marble"
                colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
              />
            ) : (
              <ChakraAvatar size="xs" src={picture} />
            )}
          </Link>
        </Box>
        <Box overflowWrap="anywhere" maxWidth={80}>
          <Link to={profileLink}>
            <Text size="sm" color="gray.400">
              {displayName}
            </Text>
          </Link>
        </Box>
        <Box overflowWrap="anywhere" maxWidth={80}>
          <Text fontSize={10} color="gray.400">
            {!displayNameEqName && name}
          </Text>
        </Box>

        {showLud && (
          <>
            {lud06 && <LUDPopover lud={lud06} name="LUD06" />}
            {lud16 && <LUDPopover lud={lud16} name="LUD16" />}
          </>
        )}

        <Spacer />

        <QRCodeModal kind={BECH32_PREFIX.Profile} value={pubkey} size="xs" />
        <Menu isLazy onOpen={loadFollowingStatus}>
          <MenuButton
            as={IconButton}
            size="xs"
            variant="outline"
            color="gray.500"
            icon={<Icon as={DotsVerticalCircleOutlineIcon} />}
          >
            Actions
          </MenuButton>
          <MenuList>
            {showFollowing && (
              <MenuItem
                icon={<Icon as={AccountMultipleIcon} />}
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
              </MenuItem>
            )}
            <MenuItem icon={<Icon as={PlaylistEditIcon} />} onClick={onOpen}>
              Lists
            </MenuItem>
            <MenuItem
              icon={<Icon as={ContentCopyIcon} />}
              onClick={copyUserLinkToClipboard}
            >
              Copy direct profile link
            </MenuItem>
            {lud06 && (
              <MenuItem
                icon={<Icon as={ContentCopyIcon} />}
                onClick={copyLud06}
              >
                Copy LUD06
              </MenuItem>
            )}
            {lud16 && (
              <MenuItem
                icon={<Icon as={ContentCopyIcon} />}
                onClick={copyLud16}
              >
                Copy LUD16
              </MenuItem>
            )}
            {showBlock && (
              <MenuItem
                icon={<Icon as={CancelIcon} />}
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
              </MenuItem>
            )}
          </MenuList>
        </Menu>
      </HStack>
      <Box overflowWrap="anywhere" mt={2}>
        {showAbout && about && <Text fontSize="sm">{about}</Text>}
      </Box>
      <ListAssignmentModal pubkey={pubkey} isOpen={isOpen} onClose={onClose} />
      <ZapModal
        user={{ pubkey, data }}
        isOpen={zapModalIsOpen}
        onClose={onZapModalClose}
      />
    </>
  );
}
