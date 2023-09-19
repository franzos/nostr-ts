import {
  useDisclosure,
  Text,
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
  Table,
  Thead,
  Th,
  Tbody,
  Box,
} from "@chakra-ui/react";
import { RelaySubscription } from "@nostr-ts/common";
import { useState, useEffect } from "react";
import { excerpt } from "../lib/excerpt";
import { useNClient } from "../state/client";
import { nEventKindToName } from "../lib/kinds";

export function SubscriptionsTable() {
  const [subscriptions, setSubscriptions] = useState<RelaySubscription[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<null | string>(null);

  const {
    isOpen: isFilterModalOpen,
    onOpen: onFilterModalOpen,
    onClose: onFilterModalClose,
  } = useDisclosure();

  const update = async () => {
    const subs = await useNClient.getState().getSubscriptions();
    if (subs) {
      setSubscriptions(subs);
    }
  };

  useEffect(() => {
    const init = async () => {
      await update();
    };
    init();
    const updateInterval = setInterval(update, 3000);

    return () => clearInterval(updateInterval);
  }, []);

  const FilterModal = (
    <Modal isOpen={isFilterModalOpen} onClose={onFilterModalClose} size="xl">
      {" "}
      <ModalOverlay />
      <ModalContent maxHeight="80vh" maxWidth="80vw">
        {" "}
        <ModalHeader>Filters</ModalHeader>
        <ModalCloseButton />
        <ModalBody overflowY="auto">
          {" "}
          <pre>{selectedFilter}</pre>
        </ModalBody>
      </ModalContent>
    </Modal>
  );

  const TableRow = (sub: RelaySubscription) => {
    const view = sub.options && sub.options.view ? sub.options.view : "";
    return (
      <Tr key={sub.id}>
        <Td>{sub.type}</Td>
        <Td>
          <Tooltip label={sub.relayUrl}>{sub.relayUrl.substring(6)}</Tooltip>
        </Td>
        <Td>
          <Text fontSize="sm">
            {sub.filters &&
              sub.filters.kinds &&
              nEventKindToName(sub.filters.kinds)}
          </Text>
        </Td>
        <Td>
          <Button
            size={"sm"}
            onClick={() => {
              setSelectedFilter(JSON.stringify(sub.filters, null, 2));
              onFilterModalOpen();
            }}
          >
            Show
          </Button>
        </Td>
        <Td>
          <Tooltip label={view}>{excerpt(view, 5)}</Tooltip>
        </Td>
        <Td>{sub.options?.timeoutIn}</Td>
        <Td>
          <Button
            size={"sm"}
            onClick={() => useNClient.getState().unsubscribe([sub.id])}
          >
            Unsubscribe
          </Button>
        </Td>
      </Tr>
    );
  };

  return (
    <Box>
      <Table variant="simple" marginBottom={4}>
        <Thead>
          <Tr>
            <Th>Type</Th>
            <Th>Relay</Th>
            <Th>Kind</Th>
            <Th>Filter</Th>
            <Th>View</Th>
            <Th>Timeout</Th>
            <Th>Action</Th>
          </Tr>
        </Thead>
        <Tbody>
          {subscriptions.map((sub) => {
            return TableRow(sub);
          })}
        </Tbody>
      </Table>
      {FilterModal}
    </Box>
  );
}
