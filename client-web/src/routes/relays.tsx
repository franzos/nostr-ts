import {
  Box,
  Button,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useDisclosure,
  Switch,
} from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { useEffect, useState } from "react";
import { WebSocketClientInfo } from "@nostr-ts/common";

export function RelaysRoute() {
  const [relays, setRelays] = useState<WebSocketClientInfo[]>([]);
  const [selectedRelay, setSelectedRelay] =
    useState<null | WebSocketClientInfo>(null);
  const [isBusy, setIsBusy] = useState(false);

  const { isOpen, onOpen, onClose } = useDisclosure();

  const update = async () => {
    await useNClient
      .getState()
      .getRelays()
      .then((r) => {
        if (r) {
          setRelays(r);
        }
      });
  };

  useEffect(() => {
    update();
    const updateInterval = setInterval(update, 2000);

    return () => clearInterval(updateInterval);
  }, []);

  const toggleRelayRead = async (rl: WebSocketClientInfo) => {
    setIsBusy(true);
    const newState = !rl.read;
    await useNClient.getState().updateRelay(rl.url, {
      read: newState,
    });
    await update();
    setIsBusy(false);
  };

  const toggleRelayWrite = async (rl: WebSocketClientInfo) => {
    setIsBusy(true);
    const newState = !rl.write;
    await useNClient.getState().updateRelay(rl.url, {
      write: newState,
    });
    await update();
    setIsBusy(false);
  };

  const RelayModal = (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent maxHeight="80vh" maxWidth="80vw">
        <ModalHeader>Relay</ModalHeader>
        <ModalCloseButton />
        <ModalBody overflowY="auto">
          {selectedRelay && selectedRelay.info && (
            <pre>
              <code>{JSON.stringify(selectedRelay.info, null, 2)}</code>
            </pre>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );

  const TableRow = (rl: WebSocketClientInfo) => {
    return (
      <Tr key={rl.url}>
        <Td>{rl.url}</Td>
        <Td>{rl.isReady ? "Ready" : "Not Ready"}</Td>
        <Td>
          <Button
            size={"sm"}
            onClick={() => {
              setSelectedRelay(rl);
              onOpen();
            }}
          >
            Show
          </Button>
        </Td>
        <Td>
          <Switch
            isChecked={rl.read}
            onChange={() => toggleRelayRead(rl)}
            isDisabled={isBusy}
          />
        </Td>

        <Td>
          <Switch
            isChecked={rl.write}
            onChange={() => toggleRelayWrite(rl)}
            isDisabled={isBusy}
          />
        </Td>
      </Tr>
    );
  };

  return (
    <Box>
      <Heading size="lg">Relays</Heading>
      <Table variant="simple" marginBottom={4}>
        <Thead>
          <Tr>
            <Th>Ready</Th>
            <Th>Url</Th>
            <Th>Info</Th>
            <Th>Read</Th>
            <Th>Write</Th>
          </Tr>
        </Thead>
        <Tbody>
          {relays.map((sub) => {
            return TableRow(sub);
          })}
        </Tbody>
      </Table>
      {RelayModal}
    </Box>
  );
}
