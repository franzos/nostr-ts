import {
  Box,
  Button,
  HStack,
  Heading,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spacer,
  Text,
  useColorMode,
  useDisclosure,
  useMediaQuery,
  useToast,
} from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { useEffect, useState } from "react";
import { RELAY_MESSAGE_TYPE } from "@nostr-ts/common";
import { NavLink } from "react-router-dom";
import { EventFormModal } from "./create-event-form-modal";
import { SubscriptionsTable } from "./subscriptions-table";
import { RelaysTable } from "./relays-table";
import { PublishingQueueTable } from "./queue-table";

export function BottomBar() {
  const { colorMode, toggleColorMode } = useColorMode();
  const [userCount, setUserCount] = useState(0);
  const [relayEvents] = useNClient((state) => [state.relayEvents]);
  const [blockedUsersCount, setBlockedUsersCount] = useState<number>(0);
  const [lastCount, setLastCount] = useState(0);
  const [subscriptionsCount, setSubscriptionsCount] = useState<number>(0);
  const [relaysCount, setRelaysCount] = useState<number>(0);
  const [queueItemsCount, setQueueItemsCount] = useState<number>(0);

  const toast = useToast();

  const update = async () => {
    if (useNClient.getState().status === "loading") return;
    const count = await useNClient.getState().countUsers();
    if (count) {
      setUserCount(count);
    }
    const subs = await useNClient.getState().getSubscriptions({
      isActive: true,
    });
    if (subs) {
      setSubscriptionsCount(subs.length);
    }
    const relays = await useNClient.getState().getRelays();
    if (relays) {
      setRelaysCount(relays.length);
    }
    const queue = await useNClient.getState().getQueueItems();
    if (queue) {
      setQueueItemsCount(queue.length);
    }
    const blockedUsers = await useNClient.getState().getAllUsersBlocked();
    if (blockedUsers) {
      setBlockedUsersCount(blockedUsers.length);
    }
  };

  useEffect(() => {
    const statsUpdateInterval = setInterval(async () => await update(), 2000);

    return () => clearInterval(statsUpdateInterval);
  }, []);

  const handleAuth = async (relayUrl: string, challenge: string) => {
    if (!relayUrl || !challenge) return;
    await useNClient.getState().relayAuth(relayUrl, challenge);
  };

  /**
   * Relay events
   */
  useEffect(() => {
    const current = relayEvents.length;
    if (current > 0) {
      const diff = current - lastCount;
      if (diff > 0) {
        setLastCount(current);
        const newEvents = relayEvents.slice(-diff);
        for (const event of newEvents) {
          let title = "";
          let description = "";
          let success = true;
          if (event.data[0] === RELAY_MESSAGE_TYPE.NOTICE) {
            title = event.data[1];
            description = `${event.meta.url}`;
          } else if (event.data[0] === RELAY_MESSAGE_TYPE.OK) {
            success = event.data[2];
            title = success ? `Event accepted` : `Event rejected`;
            description = `${event.meta.url}`;
          } else if (event.data[0] === RELAY_MESSAGE_TYPE.EOSE) {
            // Ignore for now
            return;
            // description = `Loaded all requested events for subscription ${event.data[1]}`;
          } else if (event.data[0] === RELAY_MESSAGE_TYPE.COUNT) {
            title = `Received count`;
            description = `${event.meta.url} #${
              event.data[1]
            }: ${JSON.stringify(event.data[2])} events`;
          } else if (event.data[0] === RELAY_MESSAGE_TYPE.AUTH) {
            title = "Authentication requested";
            description = `${event.meta.url}`;
            const keystore = useNClient.getState().keystore;
            if (!keystore || keystore === "none") {
              description +=
                " but no account is available to sign the challenge.";
            } else {
              handleAuth(event.meta.url, event.data[1]);
            }
          }
          if (description !== "") {
            toast({
              title,
              position: "top-right",
              description,
              status: success ? "info" : "error",
              duration: 5000,
              isClosable: true,
            });
          }
        }
      }
    }
  }, [relayEvents]);

  const {
    isOpen: isSubscriptionsModalOpen,
    onOpen: onSubscriptionsModalOpen,
    onClose: onSubscriptionsModalClose,
  } = useDisclosure();

  const SubscriptionsModal = (
    <Modal
      isOpen={isSubscriptionsModalOpen}
      onClose={onSubscriptionsModalClose}
      size="xl"
    >
      {" "}
      <ModalOverlay />
      <ModalContent maxHeight="80vh" maxWidth="80vw">
        {" "}
        <ModalHeader>
          <Heading size="lg">Subscriptions</Heading>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody overflowY="auto">
          <SubscriptionsTable />
        </ModalBody>
      </ModalContent>
    </Modal>
  );

  const {
    isOpen: isRelayModalOpen,
    onOpen: onRelayModalOpen,
    onClose: onRelayModalClose,
  } = useDisclosure();

  const RelaysModal = (
    <Modal isOpen={isRelayModalOpen} onClose={onRelayModalClose} size="xl">
      <ModalOverlay />
      <ModalContent maxHeight="80vh" maxWidth="80vw">
        <ModalHeader>
          <Heading size="lg">Relays</Heading>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody overflowY="auto">
          <RelaysTable />
        </ModalBody>
      </ModalContent>
    </Modal>
  );

  const {
    isOpen: isQueueOpen,
    onOpen: onQueueOpen,
    onClose: onQueueClose,
  } = useDisclosure();

  const QueueModal = (
    <Modal isOpen={isQueueOpen} onClose={onQueueClose} size="xl">
      <ModalOverlay />
      <ModalContent maxHeight="80vh" maxWidth="80vw">
        <ModalHeader>
          <Heading size="lg">Queue</Heading>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody overflowY="auto">
          <PublishingQueueTable />
        </ModalBody>
      </ModalContent>
    </Modal>
  );

  const [isSmallerScreen] = useMediaQuery("(max-width: 600px)");

  return (
    <Box
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      p={3}
      backgroundColor="background"
    >
      {isSmallerScreen ? (
        <HStack spacing={4}>
          <Button variant={"outline"} size="sm" onClick={toggleColorMode}>
            Toggle {colorMode === "light" ? "Dark" : "Light"}
          </Button>
          <EventFormModal buttonSize="sm" />
          <Menu>
            <MenuButton as={Button} size="sm">
              Actions
            </MenuButton>
            <MenuList>
              <MenuItem>
                <HStack spacing={2}>
                  <Text fontSize="xs">Users:</Text>
                  <Text fontSize="sm">{userCount}</Text>
                </HStack>
              </MenuItem>
              <MenuItem>
                <Link as={NavLink} to="/blocked">
                  <HStack spacing={2}>
                    <Text fontSize="xs">Blocked Users:</Text>
                    <Text fontSize="sm">{blockedUsersCount}</Text>
                  </HStack>
                </Link>
              </MenuItem>
              <MenuItem>
                <Link
                  onClick={
                    isRelayModalOpen ? onRelayModalClose : onRelayModalOpen
                  }
                >
                  <HStack spacing={2}>
                    <Text fontSize="xs">Relays:</Text>
                    <Text fontSize="sm">{relaysCount}</Text>
                  </HStack>
                </Link>
              </MenuItem>
              <MenuItem>
                <Link onClick={isQueueOpen ? onQueueClose : onQueueOpen}>
                  <HStack spacing={2}>
                    <Text fontSize="xs">Queue:</Text>
                    <Text fontSize="sm">{queueItemsCount}</Text>
                  </HStack>
                </Link>
              </MenuItem>
              <MenuItem>
                <Link
                  onClick={
                    isSubscriptionsModalOpen
                      ? onSubscriptionsModalClose
                      : onSubscriptionsModalOpen
                  }
                >
                  <HStack spacing={2}>
                    <Text fontSize="xs">Subscriptions:</Text>
                    <Text fontSize="sm">{subscriptionsCount}</Text>
                  </HStack>
                </Link>
              </MenuItem>
              <MenuItem>
                <Link href="https://github.com/franzos/nostr-ts">
                  <Text>NostrOP source (v{APP_VERSION})</Text>
                </Link>
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      ) : (
        <HStack spacing={4}>
          <>
            <Button variant={"outline"} size="sm" onClick={toggleColorMode}>
              Toggle {colorMode === "light" ? "Dark" : "Light"}
            </Button>
            <EventFormModal buttonSize="sm" />
            <Spacer />
            <HStack spacing={2}>
              <Text fontSize="xs">Users:</Text>
              <Text fontSize="sm">{userCount}</Text>
            </HStack>
            <Link as={NavLink} to="/blocked">
              <HStack spacing={2}>
                <Text fontSize="xs">Blocked Users:</Text>
                <Text fontSize="sm">{blockedUsersCount}</Text>
              </HStack>
            </Link>
            <Link
              onClick={isRelayModalOpen ? onRelayModalClose : onRelayModalOpen}
            >
              <HStack spacing={2}>
                <Text fontSize="xs">Relays:</Text>
                <Text fontSize="sm">{relaysCount}</Text>
              </HStack>
            </Link>
            <Link onClick={isQueueOpen ? onQueueClose : onQueueOpen}>
              <HStack spacing={2}>
                <Text fontSize="xs">Queue:</Text>
                <Text fontSize="sm">{queueItemsCount}</Text>
              </HStack>
            </Link>
            <Link
              onClick={
                isSubscriptionsModalOpen
                  ? onSubscriptionsModalClose
                  : onSubscriptionsModalOpen
              }
            >
              <HStack spacing={2}>
                <Text fontSize="xs">Subscriptions:</Text>
                <Text fontSize="sm">{subscriptionsCount}</Text>
              </HStack>
            </Link>
            <Link href="https://github.com/franzos/nostr-ts">
              <Text fontSize="xs">NostrOP v{APP_VERSION}</Text>
            </Link>
          </>
        </HStack>
      )}
      {SubscriptionsModal}
      {RelaysModal}
      {QueueModal}
    </Box>
  );
}
