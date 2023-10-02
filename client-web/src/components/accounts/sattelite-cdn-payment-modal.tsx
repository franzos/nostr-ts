import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from "@chakra-ui/react";
import {
  SatteliteCDNAddCredit,
  SatteliteCDNAddCreditProps,
} from "./sattelite-cdn-payment";

interface SatteliteCDNAddCreditModalProps extends SatteliteCDNAddCreditProps {
  isOpen: boolean;
}

export function SatteliteCDNAddCreditModal({
  isOpen,
  onCancel,
  onComplete,
}: SatteliteCDNAddCreditModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add Credit</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <SatteliteCDNAddCredit onCancel={onCancel} onComplete={onComplete} />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
