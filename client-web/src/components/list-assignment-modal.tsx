import { useEffect, useState } from "react";
import { useNClient } from "../state/client";
import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  useToast,
  Text,
} from "@chakra-ui/react";

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
    }[]
  >([]);

  const toast = useToast();

  const onOpen = async () => {
    const data = await useNClient.getState().getAllLists();
    if (data) {
      setLists(
        data.map((item) => ({
          id: item.id,
          title: item.title,
        }))
      );
    }
  };

  useEffect(() => {
    if (isOpen) {
      onOpen();
    }
  }, [isOpen]);

  const assignToList = async (listId: string) => {
    if (listId === "0") return;
    try {
      await useNClient.getState().addUserToList(listId, pubkey);
      toast({
        title: "User added to list",
        description: `User added to ${listId}`,
        status: "success",
        duration: 9000,
        isClosable: true,
      });
    } catch (e) {
      toast({
        title: "Already added",
        description: "User already on list",
        status: "warning",
        duration: 9000,
        isClosable: true,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add to list</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {lists && lists.length > 0 ? (
            <Select
              onChange={(ev) => assignToList(ev.target.value)}
              width={180}
            >
              <option key={"0"} value={"0"}>
                {""}
              </option>
              {lists.map((list) => {
                return (
                  <option key={list.id} value={list.id}>
                    {list.title}
                  </option>
                );
              })}
            </Select>
          ) : (
            <Text>No lists found. Create one first.</Text>
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
