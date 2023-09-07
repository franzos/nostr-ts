import {
  Avatar,
  Spacer,
  Button,
  Box,
  Image,
  Text,
  HStack,
  Select,
  useToast,
  Modal,
  ModalOverlay,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  useDisclosure,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { useNClient } from "../state/client";
import { UserInfoProps } from "../lib/user-properties";
import { BECH32_PREFIX, encodeBech32 } from "@nostr-ts/common";

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
    lists,
  },
}: UserInfoProps) {
  const name = data && data.name ? data.name : "Anonymous";
  const displayName = data && data.display_name ? data.display_name : "";
  const picture = data && data.picture ? data.picture : "";
  const banner = data && data.banner ? data.banner : undefined;
  const about = data && data.about ? data.about : undefined;

  // const mentionsLink = `/mentions/${user.pubkey}?relays=${relayUrls.join(",")}`;

  const bech32ProfileLink = encodeBech32(BECH32_PREFIX.Profile, [
    {
      type: 0,
      value: pubkey,
    },
    ...relayUrls.map((url) => ({
      type: 1,
      value: url,
    })),
  ]);

  const profileLink = `/p/${bech32ProfileLink}`;

  const toast = useToast();

  const { isOpen, onOpen, onClose } = useDisclosure();

  const assignToList = async (listId: string) => {
    if (listId === "0") return;
    try {
      await useNClient.getState().addUserToList(listId, pubkey);
      toast({
        title: "User added to list",
        description: `User added to ${listId}`,
        status: "success",
        duration: 9000,
        isClosable: true,
      });
    } catch (e) {
      toast({
        title: "Already added",
        description: "User already on list",
        status: "warning",
        duration: 9000,
        isClosable: true,
      });
    }
  };

  const SelectModal = (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add to list</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {lists && lists.length > 0 ? (
            <Select
              onChange={(ev) => assignToList(ev.target.value)}
              width={180}
            >
              <option key={"0"} value={"0"}>
                {""}
              </option>
              {lists.map((list) => {
                return (
                  <option key={list.id} value={list.id}>
                    {list.title}
                  </option>
                );
              })}
            </Select>
          ) : (
            <Text>No lists found. Create one first.</Text>
          )}
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );

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
        {lists && lists.length > 0 && (
          <Button variant="outline" size={"sm"} onClick={onOpen}>
            Lists
          </Button>
        )}
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
      {SelectModal}
    </>
  );
}
