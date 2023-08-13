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
} from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { useEffect, useState } from "react";
import { ClientSubscription } from "@nostr-ts/common";

export function SubscriptionsRoute() {
  const [subscriptions, setSubscriptions] = useState<ClientSubscription[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<null | string>(null);

  const {
    isOpen: isFilterModalOpen,
    onOpen: onFilterModalOpen,
    onClose: onFilterModalClose,
  } = useDisclosure();

  useEffect(() => {
    const load = async () => {
      const subs = useNClient.getState().client?.getSubscriptions();
      if (subs) {
        setSubscriptions(subs);
      }
    };

    load();
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

  const Subscription = (sub: ClientSubscription) => {
    return (
      <Tr key={`${sub.connectionId}-${sub.subscriptionId}`}>
        <Td>{sub.subscriptionId}</Td>
        <Td>
          <Button
            onClick={() => {
              setSelectedFilter(JSON.stringify(sub.filters, null, 2));
              onFilterModalOpen();
            }}
          >
            Show filters
          </Button>
        </Td>
        <Td>
          <Button
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
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>ID</Th>
            <Th>Filter</Th>
            <Th>Action</Th>
          </Tr>
        </Thead>
        <Tbody>
          {subscriptions.map((sub) => {
            return Subscription(sub);
          })}
        </Tbody>
      </Table>
      {FilterModal}
    </Box>
  );
}
