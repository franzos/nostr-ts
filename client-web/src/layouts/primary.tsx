import { Outlet } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Grid,
  Image,
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
import PlaylistEditIcon from "mdi-react/PlaylistEditIcon";
import { ConnectModal } from "../components/connect-modal";
import Logo from "../assets/logo.svg";
import { DEFAULT_RELAYS } from "../defaults";
import { objectOfRelaysToArray } from "../lib/object-of-relays-to-array";
import { UserIcon } from "../components/user-icon";

export function PrimaryLayout() {
  const [connected, keystore, publicKey, activeUser] = useNClient((state) => [
    state.connected,
    state.keystore,
    state.keypair?.publicKey || "",
    state.activeUser,
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

  const connect = async () => {
    await useNClient.getState().connect(objectOfRelaysToArray(DEFAULT_RELAYS));
  };

  useEffect(() => {
    const statsUpdateInterval = setInterval(update, 1000);
    connect();

    return () => clearInterval(statsUpdateInterval);
  }, []);

  const Sidebar = (
    <VStack align="start" spacing={5}>
      <MenuItem
        label="Home"
        to="/"
        leftIcon={<Icon as={FormatListBulletedIcon} marginRight={1} />}
      />

      {connected && (
        <>
          {/* <MenuItem
            label="Notifications"
            to="/notifications"
            leftIcon={<Icon as={AccountMultipleIcon} marginRight={1} />}
          /> */}

          <MenuItem
            label="Following"
            value={followingUsersCount}
            to="/following"
            leftIcon={<Icon as={AccountMultipleIcon} marginRight={1} />}
          />

          <MenuItem
            label="Lists"
            to="/lists"
            leftIcon={<Icon as={PlaylistEditIcon} marginRight={1} />}
          />

          {publicKey && publicKey !== "" && (
            <MenuItem
              label="Profile"
              to="/profile"
              leftIcon={
                <Icon
                  as={UserIcon}
                  user={activeUser}
                  opts={{
                    avatarSize: "xs",
                    relayUrls: [],
                  }}
                  marginRight={1}
                />
              }
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
            <Image height={"30px"} src={Logo} />
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
