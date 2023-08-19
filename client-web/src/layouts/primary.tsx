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
import { CreateEventForm } from "../components/create-event-form";
import { MenuItem } from "../components/menu-item";
import LanConnectIcon from "mdi-react/LanConnectIcon";
import LanDisconnectIcon from "mdi-react/LanDisconnectIcon";
import { ConnectModal } from "../components/connect-modal";

export function PrimaryLayout() {
  const [connected] = useNClient((state) => [state.connected]);
  const [subscriptionsCount, setSubscriptionsCount] = useState<number>(0);
  const [followingUsers, setFollowingUsers] = useState<NUserBase[]>([]);
  const [keystore] = useNClient((state) => [state.keystore]);

  const {
    isOpen: isConnectModalOpen,
    onOpen: onConnectModalOpen,
    onClose: onConnectModalClose,
  } = useDisclosure();

  const update = async () => {
    const following = await useNClient.getState().getAllUsersFollowing();
    if (following) {
      setFollowingUsers(following);
    }
    const subs = await useNClient.getState().subscriptions();
    if (subs) {
      setSubscriptionsCount(subs.length);
    }
  };

  useEffect(() => {
    const init = async () => {
      await update();
    };
    init();
    const statsUpdateInterval = setInterval(update, 2000);

    return () => clearInterval(statsUpdateInterval);
  }, []);

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

        <Grid templateColumns={["1fr", "0.5fr 2fr 1fr"]} gap={20}>
          {Sidebar}

          <Box maxHeight="80vh" overflowY="auto">
            <Outlet />
          </Box>
          <Box display="flex" flexDirection="column">
            <Heading as="h2" size="md" marginBottom={4}>
              Broadcast to the Network
            </Heading>
            <CreateEventForm />
          </Box>
        </Grid>
      </VStack>
      {<BottomBar />}
      {ConnectModal({
        isOpen: isConnectModalOpen,
        onOpen: onConnectModalOpen,
        onClose: onConnectModalClose,
      })}
    </Container>
  );
}
