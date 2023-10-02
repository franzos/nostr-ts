import { BECH32_PREFIX, encodeBech32 } from "@nostr-ts/common";
import {
  Icon,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
  Box,
} from "@chakra-ui/react";
import { QRCodeSVG } from "qrcode.react";
import QrcodeIcon from "mdi-react/QrcodeIcon";

interface QRCodeProps {
  kind:
    | BECH32_PREFIX.PublicKeys
    | BECH32_PREFIX.PrivateKeys
    | BECH32_PREFIX.Profile;
  value: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const labels = [
  {
    kind: BECH32_PREFIX.PublicKeys,
    label: "Public Key",
  },
  {
    kind: BECH32_PREFIX.PrivateKeys,
    label: "Private Key",
  },
  {
    kind: BECH32_PREFIX.Profile,
    label: "Profile",
  },
];

export function QRCodeModal({ kind, value, size }: QRCodeProps) {
  ("");
  const { isOpen, onOpen, onClose } = useDisclosure();

  const label = labels.find((l) => l.kind === kind)?.label || "Unknown";
  const tlvItems = [
    {
      type: 0,
      value,
    },
  ];
  const encoded = encodeBech32(kind, tlvItems);

  return (
    <>
      <IconButton
        icon={<Icon as={QrcodeIcon} />}
        onClick={isOpen ? onClose : onOpen}
        aria-label="QR"
        size={size || "md"}
      />

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent width={380}>
          <ModalHeader>{label}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Box p={4} background="#fff">
              <QRCodeSVG value={encoded} size={300} />
            </Box>
            <Input value={encoded} mt={2} isReadOnly />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
