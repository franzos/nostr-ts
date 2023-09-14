import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Image,
} from "@chakra-ui/react";
import { EventUser } from "./user";
import { LightProcessedEvent, ReactionsCount } from "@nostr-ts/common";
import { EventActionButtons, EventActionButtonsProps } from "./action-buttons";

interface EventImageModalProps extends EventActionButtonsProps {
  data: LightProcessedEvent;
  isOpen: boolean;
  onClose: () => void;
  selectedImage: string | null;
  isReady: boolean;
  isReplyOpen: boolean;
  onReplyOpen: () => void;
  onReplyClose: () => void;
  newAction: (type: "quote" | "reaction", reaction?: string) => void;
  level: number;
  showAll?: boolean;
  filteredReactions?: ReactionsCount;
}

export function EventImageModal({
  data,
  isOpen,
  onClose,
  selectedImage,
  isReady,
  isReplyOpen,
  onReplyOpen,
  onReplyClose,
  newAction,
  level,
  showAll,
  filteredReactions,
}: EventImageModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      closeOnOverlayClick={true}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <EventUser data={data} />
        </ModalHeader>
        <ModalBody>
          <Image
            src={selectedImage || ""}
            fallback={<Image src="/no-image.png" />}
            fallbackStrategy="onError"
            alt="Enlarged view"
            height="80vh"
            marginLeft="auto"
            marginRight="auto"
          />
        </ModalBody>

        <ModalFooter>
          <EventActionButtons
            data={data}
            isReady={isReady}
            isReplyOpen={isReplyOpen}
            onReplyOpen={onReplyOpen}
            onReplyClose={onReplyClose}
            newAction={newAction}
            level={level}
            showAll={showAll}
            filteredReactions={filteredReactions}
          />

          <Button marginLeft={4} onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
