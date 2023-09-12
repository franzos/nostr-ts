import {
  Box,
  Button,
  HStack,
  Heading,
  Link,
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
  useToast,
} from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { useEffect, useState } from "react";
import { RELAY_MESSAGE_TYPE } from "@nostr-ts/common";
import { excerpt } from "../lib/excerpt";
import { NavLink } from "react-router-dom";
import { EventFormModal } from "./event-form-modal";
import { SubscriptionsTable } from "./subscriptions-table";
import { RelaysTable } from "./relays-table";
import { PublishingQueueTable } from "./queue-table";

export function BottomBar() {
  const { colorMode, toggleColorMode } = useColorMode();
  const [userCount, setUserCount] = useState(0);
  const [eventsCount, relayEvents] = useNClient((state) => [
    state.events.length,
    state.relayEvents,
  ]);
  const [blockedUsersCount, setBlockedUsersCount] = useState<number>(0);
  const [totalEvents, setTotalEvents] = useState<number>(0);
  const [lastCount, setLastCount] = useState(0);
  const [subscriptionsCount, setSubscriptionsCount] = useState<number>(0);
  const [relaysCount, setRelaysCount] = useState<number>(0);
  const [queueItemsCount, setQueueItemsCount] = useState<number>(0);

  const toast = useToast();

  const update = async () => {
    if (!useNClient.getState().connected) return;
    const count = await useNClient.getState().countUsers();
    if (count) {
      setUserCount(count);
    }
    const subs = await useNClient.getState().getSubscriptions();
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
    const totalEvents = await useNClient.getState().countEvents();
    if (totalEvents) {
      setTotalEvents(totalEvents);
    }
    const blockedUsers = await useNClient.getState().getAllUsersBlocked();
    if (blockedUsers) {
      setBlockedUsersCount(blockedUsers.length);
    }
  };

  useEffect(() => {
    const statsUpdateInterval = setInterval(async () => await update(), 1000);

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
          let description = "";
          let success = true;
          if (event.data[0] === RELAY_MESSAGE_TYPE.NOTICE) {
            description = event.data[1];
          } else if (event.data[0] === RELAY_MESSAGE_TYPE.OK) {
            description = `Event ${excerpt(event.data[1], 5)}: ${
              event.data[3]
            }`;
            success = event.data[2];
          } else if (event.data[0] === RELAY_MESSAGE_TYPE.EOSE) {
            // Ignore for now
            return;
            // description = `Loaded all requested events for subscription ${event.data[1]}`;
          } else if (event.data[0] === RELAY_MESSAGE_TYPE.COUNT) {
            description = `Relay ${event.meta.url} #${
              event.data[1]
            }: ${JSON.stringify(event.data[2])} events`;
          } else if (event.data[0] === RELAY_MESSAGE_TYPE.AUTH) {
            description = `Relay ${event.meta.url}: requested authentication`;
            handleAuth(event.meta.url, event.data[1]);
          }
          if (description !== "") {
            toast({
              title: `Relay ${event.data[0]}`,
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

  return (
    <Box
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      p={3}
      backgroundColor="background"
    >
      <HStack spacing={4}>
        <>
          <Button variant={"outline"} size="sm" onClick={toggleColorMode}>
            Toggle {colorMode === "light" ? "Dark" : "Light"}
          </Button>
          <EventFormModal buttonSize="sm" />
          <Spacer />
          <HStack spacing={2}>
            <Text fontSize="sm">Events:</Text>
            <Text fontSize="xl" marginLeft={1}>
              {eventsCount} / {totalEvents}
            </Text>
          </HStack>
          <HStack spacing={2}>
            <Text fontSize="sm">Users:</Text>
            <Text fontSize="xl">{userCount}</Text>
          </HStack>
          <Link as={NavLink} to="/blocked">
            <HStack spacing={2}>
              <Text fontSize="sm">Blocked Users:</Text>
              <Text fontSize="xl">{blockedUsersCount}</Text>
            </HStack>
          </Link>
          <Link
            onClick={isRelayModalOpen ? onRelayModalClose : onRelayModalOpen}
          >
            <HStack spacing={2}>
              <Text fontSize="sm">Relays:</Text>
              <Text fontSize="xl">{relaysCount}</Text>
            </HStack>
          </Link>
          <Link onClick={isQueueOpen ? onQueueClose : onQueueOpen}>
            <HStack spacing={2}>
              <Text fontSize="sm">Queue:</Text>
              <Text fontSize="xl">{queueItemsCount}</Text>
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
              <Text fontSize="sm">Subscriptions:</Text>
              <Text fontSize="xl">{subscriptionsCount}</Text>
            </HStack>
          </Link>
        </>
      </HStack>
      {SubscriptionsModal}
      {RelaysModal}
      {QueueModal}
    </Box>
  );
}
