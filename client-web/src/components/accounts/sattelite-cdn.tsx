import {
  SCDNAccountInfo,
  sCDNAccountInfoRequest,
  sCDNGetAccountInfo,
} from "@nostr-ts/web";
import { useState } from "react";
import { useNClient } from "../../state/client";
import {
  Box,
  Button,
  Spinner,
  VStack,
  useToast,
  Text,
  Flex,
  useBreakpointValue,
  ListItem,
  ListIcon,
  List,
  Icon,
  useDisclosure,
  ButtonGroup,
  Link,
} from "@chakra-ui/react";
import CheckCircleIcon from "mdi-react/CheckCircleIcon";
import RefreshIcon from "mdi-react/RefreshIcon";
import CartIcon from "mdi-react/CartIcon";

import { toastErrorContent } from "../../lib/toast";
import { SatteliteCDNAddCreditModal } from "./sattelite-cdn-payment-modal";
import { INTEGRATION_PROVIDER } from "../../lib/integrations";
import { SatteliteCDNAccount } from "./sattelite-cdn-account";

export function SatteliteCDN() {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /**
   * User account info and balance
   */
  const [account, setAccount] = useState<SCDNAccountInfo>();

  const { isOpen, onOpen, onClose } = useDisclosure();

  const toast = useToast();

  /**
   * Check user balance
   */
  const checkBalance = async () => {
    setIsLoading(true);
    const req = sCDNAccountInfoRequest();

    try {
      const signedReq = await useNClient.getState().signEvent(req);
      const account = await sCDNGetAccountInfo(signedReq);
      setAccount(account);
      if (account && account.creditTotal > 0) {
        useNClient.getState().updateIntegration({
          kind: INTEGRATION_PROVIDER.SATTELITE_CDN,
          expiresOn: account.paidThrough,
          credit: account.creditTotal,
          storageTotal: account.storageTotal,
          storageRemaining: account.storageTotal - account.usageTotal,
        });
      }
    } catch (err) {
      toast(toastErrorContent(err as Error, `Couldn't get account info.`));
    }
    setIsLoading(false);
  };

  const onAddCreditComplete = async () => {
    onClose();
    await checkBalance();
  };

  const direction = useBreakpointValue({
    base: "column",
    md: "row",
  }) as "column" | "row" | undefined;

  return (
    <>
      <Box p={5} shadow="md" borderWidth="1px" flex="1" borderRadius="md">
        <Flex direction={direction} justify="space-between" wrap="wrap">
          {/* Column 1: Account Information */}
          <VStack spacing={4} flex="1" mr={2}>
            <Text fontSize="md" fontWeight="bold">
              Account Info
            </Text>
            {isLoading ? (
              <Spinner />
            ) : account ? (
              <SatteliteCDNAccount account={account} />
            ) : (
              <Text>No account info available</Text>
            )}
            <ButtonGroup>
              <Button
                onClick={checkBalance}
                variant={"solid"}
                isLoading={isLoading}
                leftIcon={<Icon as={RefreshIcon} />}
              >
                Check Balance
              </Button>
              <Button
                onClick={onOpen}
                variant={"outline"}
                isLoading={isLoading}
                leftIcon={<Icon as={CartIcon} />}
              >
                Buy Credit
              </Button>
            </ButtonGroup>
          </VStack>

          {/* Column 3: Service Info */}
          <VStack spacing={4} flex="1">
            <Text fontSize="md" fontWeight="bold">
              Service Spec
            </Text>
            <Text>
              <List spacing={2}>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  Upload up to 5GB / file
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  Share media; Backup notes
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  Unlimited data transfer
                </ListItem>
                <ListItem>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
                  Payment in sats
                </ListItem>
              </List>
            </Text>
            <Text>
              <Link href="https://satellite.earth/cdn" target="_blank">
                satellite.earth
              </Link>
            </Text>
          </VStack>
        </Flex>
      </Box>
      <SatteliteCDNAddCreditModal
        isOpen={isOpen}
        onCancel={onClose}
        onComplete={onAddCreditComplete}
      />
    </>
  );
}
