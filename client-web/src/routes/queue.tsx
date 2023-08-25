import { useNClient } from "../state/client";
import { useState } from "react";
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
import { PublishingQueueItem } from "@nostr-ts/common";
import { excerpt } from "../lib/excerpt";

export function PublishingQueueRoute() {
  const [queue] = useNClient((s) => [s.eventsPublishingQueue]);
  const [selectedItem, setSelectedItem] = useState<null | PublishingQueueItem>(
    null
  );

  const hasError = (item: PublishingQueueItem) => {
    return item.error ? true : false;
  };

  const error = (item: PublishingQueueItem) => {
    return item.error ? item.error : "";
  };

  const {
    isOpen: isQueueItemModalOpen,
    onOpen: onQueueItemModalOpen,
    onClose: onQueueItemModalClose,
  } = useDisclosure();

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
          {selectedItem && (
            <pre>
              <code>{JSON.stringify(selectedItem, null, 2)}</code>
            </pre>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );

  const QueueItemRow = (item: PublishingQueueItem) => {
    const eventId = item.event.id || "";
    return (
      <Tr key={eventId}>
        <Td>
          <Tooltip label={eventId}>{excerpt(eventId, 5)}</Tooltip>
        </Td>
        <Td>
          <HStack>
            {item.pow ? <Text>{item.pow}</Text> : <Text>0</Text>}
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
