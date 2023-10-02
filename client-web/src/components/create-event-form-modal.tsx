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
  Icon,
} from "@chakra-ui/react";
import { CreateEventForm } from "./create-event-form";
import SendIcon from "mdi-react/SendIcon";

interface EventFormModalProps {
  buttonSize: string;
}

export function EventFormModal(props?: EventFormModalProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      <Button
        leftIcon={<Icon size={props?.buttonSize || "xs"} as={SendIcon} />}
        size={props?.buttonSize || "md"}
        onClick={onOpen}
      >
        Post message
      </Button>
      <Modal isOpen={isOpen} onClose={onClose} closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Broadcast to the Network</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <CreateEventForm sendCallback={onClose} />
          </ModalBody>

          <ModalFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
