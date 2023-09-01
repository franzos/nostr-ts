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
import AccountMultipleIcon from "mdi-react/AccountMultipleIcon";
import TrayFullIcon from "mdi-react/TrayFullIcon";
import PlaylistStarIcon from "mdi-react/PlaylistStarIcon";
import AccountEditIcon from "mdi-react/AccountEditIcon";
import { ConnectModal } from "../components/connect-modal";

export function PrimaryLayout() {
  const [connected, keystore, eventsQueueCount, publicKey] = useNClient(
    (state) => [
      state.connected,
      state.keystore,
      state.eventsPublishingQueue.length,
      state.keypair?.publicKey || "",
    ]
  );
  const [followingUsers, setFollowingUsers] = useState<
    {
      user: NUserBase;
      relayUrls: string[];
    }[]
  >([]);

  const { isOpen, onOpen, onClose } = useDisclosure();

  const update = async () => {
    // if (!connected) return;
    const following = await useNClient.getState().getAllUsersFollowing();
    if (following) {
      setFollowingUsers(following);
    }
  };

  useEffect(() => {
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
          {/* <MenuItem
            label="Mentions"
            value={0}
            to={`/mentions/${publicKey}`}
            leftIcon={<Icon as={AccountMultipleIcon} marginRight={1} />}
          /> */}

          <MenuItem
            label="Following feed"
            to="/following-feed"
            leftIcon={<Icon as={PlaylistStarIcon} marginRight={1} />}
          />

          <MenuItem
            label="Following"
            value={followingUsers.length}
            to="/following"
            leftIcon={<Icon as={AccountMultipleIcon} marginRight={1} />}
          />

          <MenuItem
            label="Queue"
            value={eventsQueueCount}
            to="/queue"
            leftIcon={<Icon as={TrayFullIcon} marginRight={1} />}
          />

          {publicKey && publicKey !== "" && (
            <MenuItem
              label="Profile"
              to="/profile"
              leftIcon={<Icon as={AccountEditIcon} marginRight={1} />}
            />
          )}
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
    <>
      <Container maxW="8xl" p={5} marginBottom={14}>
        <VStack spacing={5} align="stretch">
          <VStack spacing={1} align="start">
            <Heading as="h1" size="lg">
              Nostr Client
            </Heading>
          </VStack>

          <Grid templateColumns={["1fr", "1fr 4fr"]} gap={20}>
            {Sidebar}

            <Box>
              <Outlet />
            </Box>
          </Grid>
        </VStack>
        {ConnectModal({
          isOpen,
          onOpen,
          onClose,
        })}
      </Container>
      <BottomBar />
    </>
  );
}
