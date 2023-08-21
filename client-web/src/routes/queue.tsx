import { useNClient } from "../state/client";
import { useState } from "react";
import { PublishingEventsQueueItem } from "../state/publishing-qeue";
import {
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Tr,
  Td,
  Tooltip,
  Button,
  Heading,
  Table,
  Thead,
  Th,
  Tbody,
  Text,
  Box,
  Icon,
  HStack,
} from "@chakra-ui/react";
import CheckCircleOutlineIcon from "mdi-react/CheckCircleOutlineIcon";
import CircleOutlineIcon from "mdi-react/CircleOutlineIcon";

export function PublishingQueueRoute() {
  const [queue] = useNClient((s) => [s.eventsPublishingQueue]);
  const [selectedItem, setSelectedItem] =
    useState<null | PublishingEventsQueueItem>(null);

  const hasError = (item: PublishingEventsQueueItem) => {
    return item.relays.find((r) => r.error) !== undefined;
  };

  const error = (item: PublishingEventsQueueItem) => {
    return item.relays.find((r) => r.error)?.error;
  };

  const {
    isOpen: isQueueItemModalOpen,
    onOpen: onQueueItemModalOpen,
    onClose: onQueueItemModalClose,
  } = useDisclosure();

  function RenderRelayInfoObject({ obj }: { obj: PublishingEventsQueueItem }) {
    return (
      <div>
        {Object.entries(obj).map(([key, value]) => {
          if (typeof value === "object" && !Array.isArray(value)) {
            return (
              <div key={key}>
                <strong>{key}:</strong>
                <RenderRelayInfoObject obj={value} />
              </div>
            );
          }
          if (Array.isArray(value)) {
            return (
              <div key={key}>
                <strong>{key}:</strong>
                <ul>
                  {value.map((v, index) => (
                    <li key={index}>
                      {typeof v === "object" ? (
                        <RenderRelayInfoObject obj={v} />
                      ) : (
                        v
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          }
          return (
            <div key={key}>
              <strong>{key}:</strong> {value ? value.toString() : "null"}
            </div>
          );
        })}
      </div>
    );
  }

  const QueueModal = (
    <Modal
      isOpen={isQueueItemModalOpen}
      onClose={onQueueItemModalClose}
      size="xl"
    >
      <ModalOverlay />
      <ModalContent maxHeight="80vh" maxWidth="80vw">
        <ModalHeader>Queue Item Detail</ModalHeader>
        <ModalCloseButton />
        <ModalBody overflowY="auto">
          {selectedItem && <RenderRelayInfoObject obj={selectedItem} />}
        </ModalBody>
      </ModalContent>
    </Modal>
  );

  const QueueItemRow = (item: PublishingEventsQueueItem) => {
    const eventId = item.event.id || "";
    return (
      <Tr key={eventId}>
        <Td>
          <Tooltip label={eventId}>{`${eventId.substring(0, 3)}..`}</Tooltip>
        </Td>
        <Td>
          <HStack>
            {item.powRequired ? (
              <Text>{item.powRequired}</Text>
            ) : (
              <Text>0</Text>
            )}
            <Text>/</Text>
            <Icon
              as={item.powDone ? CheckCircleOutlineIcon : CircleOutlineIcon}
            />
          </HStack>
        </Td>
        <Td>
          <Button
            size={"sm"}
            onClick={() => {
              setSelectedItem(item);
              onQueueItemModalOpen();
            }}
          >
            Show
          </Button>
        </Td>
        <Td>
          <Icon
            as={item.send ? CheckCircleOutlineIcon : CircleOutlineIcon}
            marginRight={1}
          />
        </Td>
        <Td>
          <Icon
            as={item.accepted ? CheckCircleOutlineIcon : CircleOutlineIcon}
          />
          {hasError(item) && <Text color="red.500">{error(item)}</Text>}
        </Td>
      </Tr>
    );
  };

  return (
    <Box>
      <Heading size="lg">Queue</Heading>
      <Table variant="simple" marginBottom={4}>
        <Thead>
          <Tr>
            <Th>Event ID</Th>
            <Th>POW / Done</Th>
            <Th>Info</Th>
            <Th>Send</Th>
            <Th>Accepted</Th>
          </Tr>
        </Thead>
        <Tbody>
          {queue.map((item) => {
            return QueueItemRow(item);
          })}
        </Tbody>
      </Table>
      {QueueModal}
    </Box>
  );
}
