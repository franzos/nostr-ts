import {
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
} from "@chakra-ui/react";
import { CreateEventForm } from "./create-event-form";

interface EventFormModalProps {
  buttonSize: string;
}

export function EventFormModal(props?: EventFormModalProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const sendCallback = () => {
    onClose();
  };

  return (
    <>
      <Button size={props?.buttonSize || "md"} onClick={onOpen}>
        Post message
      </Button>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Broadcast to the Network</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <CreateEventForm sendCallback={sendCallback} />
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
