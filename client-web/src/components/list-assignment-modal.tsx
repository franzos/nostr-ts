import { useEffect, useState } from "react";
import {
  Button,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useNClient } from "../state/client";

interface ListAssignmentProps {
  pubkey: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ListAssignmentModal({
  pubkey,
  isOpen,
  onClose,
}: ListAssignmentProps) {
  const [lists, setLists] = useState<
    {
      id: string;
      title: string;
      isAssigned: boolean;
    }[]
  >([]);

  const toast = useToast();

  const onOpen = async () => {
    // Get all lists
    const data = await useNClient.getState().getAllLists();
    const initialLists =
      data?.map((item) => ({
        id: item.id,
        title: item.title,
        isAssigned: false,
      })) || [];

    // Check which lists the user is already assigned to
    const withUser = await useNClient.getState().getListsWithUser(pubkey);
    const updatedLists = initialLists.map((list) => ({
      ...list,
      isAssigned: Boolean(withUser?.find((uList) => uList.id === list.id)),
    }));
    setLists(updatedLists);
  };

  useEffect(() => {
    if (isOpen) {
      onOpen();
    }
  }, [isOpen]);

  const toggleListAssignment = async (listId: string, isAssigned: boolean) => {
    try {
      if (isAssigned) {
        await useNClient.getState().removeUserFromList(listId, pubkey);
        toast({
          title: "User removed from list",
          status: "success",
          duration: 9000,
          isClosable: true,
        });
      } else {
        await useNClient.getState().addUserToList(listId, pubkey);
        toast({
          title: "User added to list",
          status: "success",
          duration: 9000,
          isClosable: true,
        });
      }

      // Update list state
      setLists((prevLists) =>
        prevLists.map((list) =>
          list.id === listId ? { ...list, isAssigned: !isAssigned } : list
        )
      );
    } catch (e) {
      toast({
        title: "Operation failed",
        description: (e as Error).message || "Something went wrong",
        status: "error",
        duration: 9000,
        isClosable: true,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add or Remove from List</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {lists.length === 0 ? (
            <Text>No lists found. Create one first.</Text>
          ) : (
            lists.map((list) => (
              <HStack key={list.id}>
                <Text>{list.title}</Text>
                <Button
                  onClick={() => toggleListAssignment(list.id, list.isAssigned)}
                >
                  {list.isAssigned ? "Remove from List" : "Add to List"}
                </Button>
              </HStack>
            ))
          )}
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
