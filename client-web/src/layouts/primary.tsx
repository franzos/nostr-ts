import { Outlet } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Grid,
  Heading,
  Icon,
  VStack,
  useDisclosure,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useNClient } from "../state/client";
import { BottomBar } from "../components/bottom-bar";
import { NUserBase } from "@nostr-ts/common";
import { MenuItem } from "../components/menu-item";
import LanConnectIcon from "mdi-react/LanConnectIcon";
import LanDisconnectIcon from "mdi-react/LanDisconnectIcon";
import FormatListBulletedIcon from "mdi-react/FormatListBulletedIcon";
import AccountKeyIcon from "mdi-react/AccountKeyIcon";
import PlaylistCheckIcon from "mdi-react/PlaylistCheckIcon";
import AccountMultipleIcon from "mdi-react/AccountMultipleIcon";
import ConnectionIcon from "mdi-react/ConnectionIcon";
import TrayFullIcon from "mdi-react/TrayFullIcon";
import { ConnectModal } from "../components/connect-modal";

export function PrimaryLayout() {
  const [connected, keystore, eventsQueueCount] = useNClient((state) => [
    state.connected,
    state.keystore,
    state.eventsPublishingQueue.length,
  ]);
  const [subscriptionsCount, setSubscriptionsCount] = useState<number>(0);
  const [followingUsers, setFollowingUsers] = useState<NUserBase[]>([]);
  const [relaysCount, setRelaysCount] = useState<number>(0);

  const { isOpen, onOpen, onClose } = useDisclosure();

  const update = async () => {
    const following = await useNClient.getState().getAllUsersFollowing();
    if (following) {
      setFollowingUsers(following);
    }
    const subs = await useNClient.getState().getSubscriptions();
    if (subs) {
      setSubscriptionsCount(subs.length);
    }
    const relays = await useNClient.getState().getRelays();
    if (relays) {
      setRelaysCount(relays.length);
    }
  };

  useEffect(() => {
    const init = async () => {
      await update();
    };
    init();
    const statsUpdateInterval = setInterval(update, 1000);

    return () => clearInterval(statsUpdateInterval);
  }, []);

  const Sidebar = (
    <VStack align="start" spacing={5} w="100%">
      <MenuItem
        label="Home"
        to="/"
        leftIcon={<Icon as={FormatListBulletedIcon} marginRight={1} />}
      />

      {connected && (
        <>
          <MenuItem
            label="Following"
            value={followingUsers.length}
            to="/following"
            leftIcon={<Icon as={AccountMultipleIcon} marginRight={1} />}
          />

          <MenuItem
            label="Subscriptions"
            value={subscriptionsCount}
            to="/subscriptions"
            leftIcon={<Icon as={PlaylistCheckIcon} marginRight={1} />}
          />

          <MenuItem
            label="Relays"
            value={relaysCount}
            to="/relays"
            leftIcon={<Icon as={ConnectionIcon} marginRight={1} />}
          />

          <MenuItem
            label="Queue"
            value={eventsQueueCount}
            to="/queue"
            leftIcon={<Icon as={TrayFullIcon} marginRight={1} />}
          />
        </>
      )}

      <MenuItem
        label="Account"
        value={keystore}
        to="/account"
        leftIcon={<Icon as={AccountKeyIcon} marginRight={1} />}
      />

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
          onClick={onOpen}
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

        <Grid templateColumns={["1fr", "1fr 4fr"]} gap={20}>
          {Sidebar}

          <Box maxHeight="80vh" overflowY="auto">
            <Outlet />
          </Box>
        </Grid>
      </VStack>
      {<BottomBar />}
      {ConnectModal({
        isOpen,
        onOpen,
        onClose,
      })}
    </Container>
  );
}
