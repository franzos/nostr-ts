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
  Tooltip,
  Switch,
} from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { useEffect, useState } from "react";
import {
  RelayInformationDocument,
  WebSocketClientInfo,
} from "@nostr-ts/common";
import { excerpt } from "../lib/excerpt";

export function RelaysRoute() {
  const [relays, setRelays] = useState<WebSocketClientInfo[]>([]);
  const [selectedRelay, setSelectedRelay] =
    useState<null | WebSocketClientInfo>(null);
  const [isBusy, setIsBusy] = useState(false);

  const {
    isOpen: isRelayModalOpen,
    onOpen: onRelayModalOpen,
    onClose: onRelayModalClose,
  } = useDisclosure();

  const update = async () => {
    const rls = await useNClient.getState().getRelays();
    if (rls) {
      setRelays(rls);
    }
  };

  useEffect(() => {
    const init = async () => {
      await update();
    };
    init();
    const updateInterval = setInterval(update, 2000);

    return () => clearInterval(updateInterval);
  }, []);

  const toggleRelayRead = async (rl: WebSocketClientInfo) => {
    setIsBusy(true);
    const newState = !rl.read;
    await useNClient.getState().updateRelay(rl.id, {
      read: newState,
    });
    await update();
    setIsBusy(false);
  };

  const toggleRelayWrite = async (rl: WebSocketClientInfo) => {
    setIsBusy(true);
    const newState = !rl.write;
    await useNClient.getState().updateRelay(rl.id, {
      write: newState,
    });
    await update();
    setIsBusy(false);
  };

  function RenderInfoObject({ obj }: { obj: RelayInformationDocument }) {
    if (!obj) return null;

    return (
      <div>
        {Object.entries(obj).map(([key, value]) => {
          // If value is an object and not an array, recurse with RenderInfoObject
          if (
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value)
          ) {
            return (
              <div key={key}>
                <strong>{key}:</strong>
                <RenderInfoObject obj={value} />
              </div>
            );
          }

          // If value is an array, map over its items and render them
          if (Array.isArray(value)) {
            return (
              <div key={key}>
                <strong>{key}:</strong>
                <ul>
                  {value.map((item, index) => (
                    <li key={index}>
                      {typeof item === "object" && item !== null ? (
                        <RenderInfoObject obj={item} />
                      ) : (
                        item.toString()
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          }

          // For primitives, render them directly
          return (
            <div key={key}>
              <strong>{key}:</strong> {value?.toString()}
            </div>
          );
        })}
      </div>
    );
  }

  const RelayModal = (
    <Modal isOpen={isRelayModalOpen} onClose={onRelayModalClose} size="xl">
      <ModalOverlay />
      <ModalContent maxHeight="80vh" maxWidth="80vw">
        <ModalHeader>Relay</ModalHeader>
        <ModalCloseButton />
        <ModalBody overflowY="auto">
          {selectedRelay && selectedRelay.info && (
            <RenderInfoObject obj={selectedRelay.info} />
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );

  const TableRow = (rl: WebSocketClientInfo) => {
    return (
      <Tr key={rl.id}>
        <Td>
          <Tooltip label={rl.id}>{excerpt(rl.id, 5)}</Tooltip>
        </Td>
        <Td>{rl.url}</Td>
        <Td>
          <Button
            size={"sm"}
            onClick={() => {
              setSelectedRelay(rl);
              onRelayModalOpen();
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
            <Th>ID</Th>
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
