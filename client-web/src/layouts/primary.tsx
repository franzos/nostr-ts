import { Outlet } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Flex,
  Grid,
  Heading,
  Icon,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
  useDisclosure,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useNClient } from "../state/client";
import { BottomBar } from "../components/bottom-bar";
import { NUserBase } from "@nostr-ts/common";
import { CreateEventForm } from "../components/create-event-form";
import { MenuItem } from "../components/menu-item";
import LanConnectIcon from "mdi-react/LanConnectIcon";
import LanDisconnectIcon from "mdi-react/LanDisconnectIcon";
import { DEFAULT_RELAYS } from "../defaults";

export function PrimaryLayout() {
  const [connected] = useNClient((state) => [state.connected]);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [subscriptionsCount, setSubscriptionsCount] = useState<number>(0);
  const [followingUsers, setFollowingUsers] = useState<NUserBase[]>([]);
  const [keystore] = useNClient((state) => [state.keystore]);

  const [initialRelayUrls, setInitialRelayUrls] =
    useState<string[]>(DEFAULT_RELAYS);
  const [newRelayUrl, setNewRelayUrl] = useState<string>("");
  const {
    isOpen: isConnectModalOpen,
    onOpen: onConnectModalOpen,
    onClose: onConnectModalClose,
  } = useDisclosure();

  useEffect(() => {
    const statsUpdateInterval = setInterval(async () => {
      const now = Date.now();

      if (now - lastUpdate > 5000) {
        setLastUpdate(now);
        const following = await useNClient.getState().getAllUsersFollowing();
        if (following) {
          setFollowingUsers(following);
        }
        const subs = useNClient.getState().client?.getSubscriptions();
        if (subs) {
          setSubscriptionsCount(subs.length);
        }
      }
    }, 1000);

    return () => clearInterval(statsUpdateInterval);
  }, []);

  const ConnectModal = (
    <Modal isOpen={isConnectModalOpen} onClose={onConnectModalClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Connect to Relay(s)</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text>
            You can find a list of relays in the nostr-ts repository
            <Link
              marginLeft={1}
              href="https://github.com/franzos/nostr-ts/blob/master/discovered-relays.json"
              isExternal
              color="blue.500"
            >
              github.com/franzos/nostr-ts
            </Link>
            ,
            <Link
              marginLeft={1}
              marginRight={1}
              href="https://nostr.info/relays/"
              isExternal
              color="blue.500"
            >
              nostr.info
            </Link>
            and elsewhere.
          </Text>
          {/* List of Relays */}
          <VStack spacing={3} width="100%">
            {initialRelayUrls.map((url, index) => (
              <Flex
                key={index}
                width="100%"
                alignItems="center"
                borderBottom="1px solid"
                borderColor="gray.200"
                py={2}
              >
                <Text flex="1" marginLeft="2">
                  {url}
                </Text>
                <Button
                  ml="auto"
                  onClick={() => {
                    const newUrls = initialRelayUrls.filter((u) => u !== url);
                    setInitialRelayUrls(newUrls);
                  }}
                >
                  Remove
                </Button>
              </Flex>
            ))}
          </VStack>

          {/* Input for Adding New Relays */}
          <Flex direction="row" alignItems="center">
            <Input
              flex="1"
              value={newRelayUrl}
              onChange={(e) => setNewRelayUrl(e.target.value)}
              placeholder="Enter new relay URL"
            />
            <Button
              ml={2}
              onClick={() => {
                if (newRelayUrl.trim() !== "") {
                  setInitialRelayUrls([...initialRelayUrls, newRelayUrl]);
                  setNewRelayUrl("");
                }
              }}
            >
              Add
            </Button>
          </Flex>
        </ModalBody>
        <ModalFooter>
          <Button
            colorScheme="green"
            disabled={initialRelayUrls.length === 0}
            onClick={() => {
              useNClient.getState().connect(initialRelayUrls);
              onConnectModalClose();
            }}
          >
            Connect
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );

  const Sidebar = (
    <VStack align="start" spacing={5} w="100%">
      <MenuItem label="Home" to="/" />

      {connected && (
        <>
          <MenuItem
            label="Following"
            value={followingUsers.length}
            to="/following"
          />

          <MenuItem
            label="Subscriptions"
            value={subscriptionsCount}
            to="/subscriptions"
          />
        </>
      )}

      <MenuItem label="Account" value={keystore} to="/account" />

      {connected ? (
        <Button
          w="100%"
          colorScheme="red"
          onClick={useNClient.getState().disconnect}
        >
          <Icon as={LanDisconnectIcon} marginRight={1} />
          Disconnect
        </Button>
      ) : (
        <Button
          w="100%"
          colorScheme="green"
          onClick={onConnectModalOpen}
          leftIcon={<Icon as={LanConnectIcon} />}
        >
          Connect to relay(s)
        </Button>
      )}
    </VStack>
  );

  return (
    <Container maxW="8xl" p={5}>
      <VStack spacing={5} align="stretch">
        <VStack spacing={1} align="start">
          <Heading as="h1" size="lg">
            Nostr Client
          </Heading>
        </VStack>

        <Grid templateColumns={["1fr", "1fr 2fr 1fr"]} gap={20}>
          {Sidebar}

          <Box maxHeight="80vh" overflowY="auto">
            <Outlet />
          </Box>
          <Box display="flex" flexDirection="column" alignItems="flex-end">
            <Heading as="h2" size="md">
              Broadcast
            </Heading>
            <CreateEventForm />
          </Box>
        </Grid>
      </VStack>
      {BottomBar()}
      {ConnectModal}
    </Container>
  );
}
