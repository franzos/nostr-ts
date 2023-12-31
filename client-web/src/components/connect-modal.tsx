import {
  Modal,
  Text,
  Link,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  VStack,
  Flex,
  Button,
  Input,
  ModalFooter,
  useToast,
  ButtonGroup,
} from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { useEffect, useState } from "react";
import { DEFAULT_RELAYS } from "../defaults";
import { Relay } from "@nostr-ts/common";
import { objectOfRelaysToArray } from "../lib/object-of-relays-to-array";

interface ConnectModalProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export function ConnectModal({ isOpen, onClose }: ConnectModalProps) {
  const [initialRelayUrls, setInitialRelayUrls] = useState<Relay[]>(
    objectOfRelaysToArray(DEFAULT_RELAYS)
  );
  const [newRelayUrl, setNewRelayUrl] = useState<string>("");
  const [loadingRelaysNos2x, setLoadingRelaysNos2x] = useState<boolean>(false);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const toast = useToast();

  const relaysFromExtention = async (retryCount?: number) => {
    setLoadingRelaysNos2x(true);
    if (window.nostr && window.nostr.getRelays) {
      try {
        const relaysObject = await window.nostr.getRelays();
        setInitialRelayUrls(objectOfRelaysToArray(relaysObject));
        setLoadingRelaysNos2x(false);
      } catch (error) {
        console.error("Error loading relays:", error);
        let msg = "Unknown error";
        if (error instanceof Error) {
          msg = error.message;
        }
        toast({
          title: "Error loading relays",
          description: msg,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setLoadingRelaysNos2x(false);
      }
    } else {
      console.log(`Nostr extention not ready, retry ${retryCount}`);
      const count = retryCount ? retryCount + 1 : 1;
      if (count > 2) {
        toast({
          title: "Error loading relays",
          description: `nos2x extention not available or ready.`,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setLoadingRelaysNos2x(false);
        return;
      }
      setTimeout(() => relaysFromExtention(count), 1000); // retry after 1 second
    }
  };

  const resetRelays = () => {
    setInitialRelayUrls(objectOfRelaysToArray(DEFAULT_RELAYS));
  };

  useEffect(() => {
    const relays = localStorage.getItem("nostr-client:relays");
    if (relays) {
      setInitialRelayUrls(JSON.parse(relays));
    }
  }, []);

  const connect = async () => {
    setIsBusy(true);
    localStorage.setItem(
      "nostr-client:relays",
      JSON.stringify(initialRelayUrls)
    );
    await useNClient.getState().connect(initialRelayUrls);
    setIsBusy(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
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
            {initialRelayUrls &&
              initialRelayUrls.map((relay) => (
                <Flex key={relay.url} width="100%" alignItems="center" py={2}>
                  <Text flex="1" marginLeft="2">
                    {relay.url}
                  </Text>
                  <Button
                    ml="auto"
                    onClick={() => {
                      const newUrls = initialRelayUrls.filter(
                        (r) => r.url !== relay.url
                      );
                      setInitialRelayUrls(newUrls);
                    }}
                  >
                    Remove
                  </Button>
                </Flex>
              ))}
          </VStack>

          {/* Input for Adding New Relays */}
          <Flex direction="row" alignItems="center" pt={4}>
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
                  setInitialRelayUrls([
                    ...initialRelayUrls,
                    {
                      url: newRelayUrl,
                      read: true,
                      write: true,
                    },
                  ]);
                  setNewRelayUrl("");
                }
              }}
            >
              Add
            </Button>
          </Flex>

          <ButtonGroup>
            <Button
              isLoading={loadingRelaysNos2x}
              onClick={() => relaysFromExtention()}
              size="xs"
              marginTop={2}
            >
              Load from nos2x
            </Button>
            <Button
              isLoading={loadingRelaysNos2x}
              onClick={resetRelays}
              size="xs"
              marginTop={2}
            >
              Reset
            </Button>
          </ButtonGroup>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="outline"
            isDisabled={initialRelayUrls.length === 0}
            isLoading={isBusy}
            onClick={connect}
          >
            Connect
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
