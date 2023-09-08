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
import { MenuItem } from "../components/menu-item";
import LanConnectIcon from "mdi-react/LanConnectIcon";
import LanDisconnectIcon from "mdi-react/LanDisconnectIcon";
import FormatListBulletedIcon from "mdi-react/FormatListBulletedIcon";
import AccountKeyIcon from "mdi-react/AccountKeyIcon";
import AccountMultipleIcon from "mdi-react/AccountMultipleIcon";
import AccountEditIcon from "mdi-react/AccountEditIcon";
import { ConnectModal } from "../components/connect-modal";
import InlineSvg from "react-inlinesvg";

export function PrimaryLayout() {
  const [connected, keystore, publicKey] = useNClient((state) => [
    state.connected,
    state.keystore,
    state.keypair?.publicKey || "",
  ]);
  const [followingUsersCount, setFollowingUsersCount] = useState<number>(0);

  const { isOpen, onOpen, onClose } = useDisclosure();

  const update = async () => {
    if (!useNClient.getState().connected) return;
    const following = await useNClient.getState().getAllUsersFollowing();
    if (following) {
      setFollowingUsersCount(following.length);
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
          <MenuItem
            label="Following"
            value={followingUsersCount}
            to="/following"
            leftIcon={<Icon as={AccountMultipleIcon} marginRight={1} />}
          />

          <MenuItem
            label="Lists"
            to="/lists"
            leftIcon={<Icon as={AccountMultipleIcon} marginRight={1} />}
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
          variant={"outline"}
          onClick={useNClient.getState().disconnect}
        >
          <Icon as={LanDisconnectIcon} marginRight={1} />
          Disconnect
        </Button>
      ) : (
        <Button
          w="100%"
          // colorScheme="gre
          variant={"solid"}
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
              <InlineSvg
                src="/logo.svg"
                width="60px"
                height="60px"
                fill="#ffffff"
              />
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
