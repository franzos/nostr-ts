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
import { LightProcessedEvent } from "@nostr-ts/common";
import { Link as RouterLink } from "react-router-dom";

interface EventInfoModalProps {
  data: LightProcessedEvent;
  nEventString: string;
  isOpen: boolean;
  onClose: () => void;
}

export function EventInfoModal({
  data,
  nEventString,
  isOpen,
  onClose,
}: EventInfoModalProps) {
  const eventLink = `${window.location.origin}/e/${nEventString}`;

  const relay = data.eventRelayUrls
    ? data.eventRelayUrls[0]
    : "Unknown (from local DB)";

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
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
          <Text>Relay: {relay}</Text>
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
