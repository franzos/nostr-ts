import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from "@chakra-ui/react";
import { Zap } from "./zap";
import { UserBase, EventBaseSigned } from "@nostr-ts/common";

interface ZapModalProps {
  user: UserBase;
  relatedEvent?: EventBaseSigned;
  isOpen: boolean;
  onClose: () => void;
}

export const ZapModal = ({
  user,
  relatedEvent,
  isOpen,
  onClose,
}: ZapModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent maxWidth={300}>
        <ModalHeader>Send sats (WIP)</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Zap
            user={user}
            relatedEvent={relatedEvent}
            onConfirmPayment={onClose}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
