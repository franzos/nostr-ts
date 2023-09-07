import {
  Box,
  Button,
  HStack,
  Heading,
  Input,
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
  Spacer,
} from "@chakra-ui/react";
import { useNClient } from "../state/client";
import { useEffect, useState } from "react";
import { ProcessedListRecord } from "../state/base-types";
import { UserIcon } from "../components/user-icon";
import { UserInfo } from "../components/user-info";

export function ListsRoute() {
  const [lists, setLists] = useState<ProcessedListRecord[]>([]);
  const [selectedList, setSelectedList] = useState<null | ProcessedListRecord>(
    null
  );

  const [newListTitle, setNewListTitle] = useState<string>("");

  const [isBusy, setIsBusy] = useState(false);

  const { isOpen, onOpen, onClose } = useDisclosure();

  const updateView = async () => {
    await useNClient
      .getState()
      .getAllLists()
      .then((r) => {
        if (r) {
          setLists(r);
        }
      });
  };

  useEffect(() => {
    updateView();
    const updateInterval = setInterval(updateView, 2000);

    return () => clearInterval(updateInterval);
  }, []);

  const create = async () => {
    setIsBusy(true);
    await useNClient.getState().createList({
      title: newListTitle,
    });
    setNewListTitle("");
    setIsBusy(false);
  };

  const remove = async (id: string) => {
    setIsBusy(true);
    await useNClient.getState().deleteList(id);
    setIsBusy(false);
    await updateView();
  };

  const removeUser = async (pubkey: string) => {
    if (!selectedList) return;
    setIsBusy(true);
    await useNClient.getState().removeUserFromList(selectedList.id, pubkey);
    await updateView();
    if (selectedList.users) {
      setSelectedList({
        ...selectedList,
        users: selectedList.users.filter((u) => u.user.pubkey !== pubkey),
      });
    }
    setIsBusy(false);
  };

  const UsersList = (list?: ProcessedListRecord) => {
    return (
      <Box>
        {list?.users &&
          list.users.map((u) => {
            return (
              <UserIcon
                key={u.user.pubkey}
                user={u.user}
                options={{
                  avatarSize: "sm",
                  relayUrls: u.relayUrls,
                }}
              />
            );
          })}
      </Box>
    );
  };

  const ListModal = (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent maxHeight="80vh" maxWidth="80vw">
        <ModalHeader>List</ModalHeader>
        <ModalCloseButton />
        <ModalBody overflowY="auto">
          {selectedList?.users &&
            selectedList.users.map((u) => {
              return (
                <Box p={1} key={u.user.pubkey}>
                  <HStack>
                    <UserInfo
                      key={u.user.pubkey}
                      user={u.user}
                      opts={{
                        avatarSize: "sm",
                        relayUrls: u.relayUrls,
                      }}
                    />
                    <Spacer />
                    <Button
                      size={"sm"}
                      onClick={() => removeUser(u.user.pubkey)}
                      isLoading={isBusy}
                    >
                      Remove
                    </Button>
                  </HStack>
                </Box>
              );
            })}
        </ModalBody>
      </ModalContent>
    </Modal>
  );

  const TableRow = (rl: ProcessedListRecord) => {
    return (
      <Tr key={rl.id}>
        <Td>{rl.title}</Td>
        <Td>{UsersList(rl)}</Td>
        <Td>
          <Button
            size={"sm"}
            onClick={() => {
              setSelectedList(rl);
              onOpen();
            }}
          >
            Edit
          </Button>
        </Td>
        <Td>
          <Button size={"sm"} onClick={() => remove(rl.id)} isLoading={isBusy}>
            Delete
          </Button>
        </Td>
      </Tr>
    );
  };

  return (
    <Box>
      <Heading size="lg">Lists</Heading>
      <Text>Lists make it easy to organize users.</Text>
      <Box mt={2} mb={2}>
        <HStack>
          <Input
            value={newListTitle}
            onChange={(e) => setNewListTitle(e.target.value)}
            placeholder="Friends"
          />
          <Button size={"sm"} onClick={create} isLoading={isBusy}>
            Create list
          </Button>
        </HStack>
      </Box>
      <Table variant="simple" marginBottom={4}>
        <Thead>
          <Tr>
            <Th>Title</Th>
            <Th>Users</Th>
            <Th></Th>
            <Th></Th>
          </Tr>
        </Thead>
        <Tbody>
          {lists.map((sub) => {
            return TableRow(sub);
          })}
        </Tbody>
      </Table>
      {ListModal}
    </Box>
  );
}
