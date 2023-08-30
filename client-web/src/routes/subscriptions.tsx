import {
  Box,
  Button,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useDisclosure,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { useEffect, useState } from "react";
import { RelaySubscription, NEVENT_KIND } from "@nostr-ts/common";
import { excerpt } from "../lib/excerpt";

const kinds = Object.keys(NEVENT_KIND).map((k) => {
  return {
    name: k,
    value: NEVENT_KIND[k as keyof typeof NEVENT_KIND],
  };
});

const kindToName = (kind: NEVENT_KIND) => {
  const kindObj = kinds.find((k) => k.value === kind);
  if (kindObj) {
    return kindObj.name;
  }
  return "Unknown";
};

const kindsToName = (kinds: NEVENT_KIND[]) => {
  return kinds.map(kindToName).join(", ");
};

export function SubscriptionsRoute() {
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
    const updateInterval = setInterval(update, 1000);

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
        <Td>
          <Tooltip label={sub.id}>{excerpt(sub.id, 5)}</Tooltip>
        </Td>
        <Td>
          <Tooltip label={sub.relayUrl}>{sub.relayUrl.substring(6)}</Tooltip>
        </Td>
        <Td>
          <Text fontSize="sm">
            {sub.filters && sub.filters.kinds && kindsToName(sub.filters.kinds)}
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
      <Heading size="lg">Subscriptions</Heading>
      <Table variant="simple" marginBottom={4}>
        <Thead>
          <Tr>
            <Th>ID</Th>
            <Th>Relay</Th>
            <Th>Kind</Th>
            <Th>Filter</Th>
            <Th>View</Th>
            <Th>Action</Th>
          </Tr>
        </Thead>
        <Tbody>
          {subscriptions.map((sub) => {
            return TableRow(sub);
          })}
        </Tbody>
      </Table>
      <Heading size="md" marginBottom={2}>
        Legend
      </Heading>
      {kinds.map((k) => {
        return (
          <Text key={k.name}>
            {k.name} - {k.value}
          </Text>
        );
      })}
      {FilterModal}
    </Box>
  );
}
