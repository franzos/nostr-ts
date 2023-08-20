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
import { ClientSubscription, NEVENT_KIND } from "@nostr-ts/common";

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
  const [subscriptions, setSubscriptions] = useState<ClientSubscription[]>([]);
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
    const updateInterval = setInterval(update, 2000);

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

  const TableRow = (sub: ClientSubscription) => {
    const view = sub.options && sub.options.view ? sub.options.view : "";
    return (
      <Tr key={`${sub.connectionId}-${sub.subscriptionId}`}>
        <Td>
          <Tooltip label={sub.subscriptionId}>
            {`${sub.subscriptionId.substring(0, 3)}..`}
          </Tooltip>
        </Td>
        <Td>{sub.filters.kinds && kindsToName(sub.filters.kinds)}</Td>
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
          <Tooltip label={view}>{`${view.substring(0, 4)}..`}</Tooltip>
        </Td>
        <Td>
          <Button
            size={"sm"}
            onClick={() =>
              useNClient.getState().unsubscribe(sub.subscriptionId)
            }
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
