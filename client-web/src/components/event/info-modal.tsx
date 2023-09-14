import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Box,
  Text,
  Link,
} from "@chakra-ui/react";
import {
  BECH32_PREFIX,
  LightProcessedEvent,
  encodeBech32,
} from "@nostr-ts/common";
import { Link as RouterLink } from "react-router-dom";

interface EventInfoModalProps {
  data: LightProcessedEvent;
  isEventModalOpen: boolean;
  onEventModalClose: () => void;
}

export function EventInfoModal({
  data,
  isEventModalOpen,
  onEventModalClose,
}: EventInfoModalProps) {
  const eventLink = `/e/${encodeBech32(BECH32_PREFIX.NoteIDs, [
    {
      type: 0,
      value: data.event.id,
    },
  ])}`;

  return (
    <Modal isOpen={isEventModalOpen} onClose={onEventModalClose} size="xl">
      <ModalOverlay />
      <ModalContent maxHeight="80vh" maxWidth="80vw">
        <ModalHeader>Event</ModalHeader>
        <ModalCloseButton />
        <ModalBody overflowY="auto">
          <Text>
            Link:{" "}
            <Link as={RouterLink} to={eventLink}>
              {eventLink}
            </Link>
          </Text>
          <Text>Relay: {data.eventRelayUrls[0]}</Text>
          <Box m={4}>
            <pre>
              <code>{JSON.stringify(data.event, null, 2)}</code>
            </pre>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
