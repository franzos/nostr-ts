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
  Text,
  Tooltip,
} from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { useEffect, useState } from "react";
import {
  NEVENT_KIND,
  RelayInformationDocument,
  WebSocketClientInfo,
} from "@nostr-ts/common";

const kinds = Object.keys(NEVENT_KIND).map((k) => {
  return {
    name: k,
    value: NEVENT_KIND[k as keyof typeof NEVENT_KIND],
  };
});

export function RelaysRoute() {
  const [relays, setRelays] = useState<WebSocketClientInfo[]>([]);
  const [selectedRelay, setSelectedRelay] =
    useState<null | WebSocketClientInfo>(null);

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
          <Tooltip label={rl.id}>{`${rl.id.substring(0, 3)}..`}</Tooltip>
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
        <Td>{rl.read && <Text>TRUE</Text>}</Td>
        <Td>{rl.write && <Text>TRUE</Text>}</Td>
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
      <Heading size="md" marginBottom={2}>
        Legend
      </Heading>
      {kinds.map((k) => {
        return (
          <Text key={k.name}>
            {k.name} - {k.value}
          </Text>
        );
      })}
      {RelayModal}
    </Box>
  );
}
