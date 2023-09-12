import { HStack, Text, Spacer, Checkbox, Box, Icon } from "@chakra-ui/react";
import CircleOutlineIcon from "mdi-react/CircleOutlineIcon";
import CircleSlice8Icon from "mdi-react/CircleSlice8Icon";
import SendLockIcon from "mdi-react/SendLockIcon";
import SendCheckIcon from "mdi-react/SendCheckIcon";

import { WebSocketClientInfo } from "@nostr-ts/common";

export interface RelaySelectionProps {
  relays: {
    data: WebSocketClientInfo;
    isAssigned: boolean;
  }[];
  onChange: (url: string, action: "add" | "remove") => void;
}

export function RelaySelection({ relays, onChange }: RelaySelectionProps) {
  const toggleSelection = (listId: string, isAssigned: boolean) => {
    onChange(listId, isAssigned ? "remove" : "add");
  };

  return (
    <Box p={2}>
      {relays.length === 0 ? (
        <Text>No relays found.</Text>
      ) : (
        relays.map((item) => (
          <HStack key={item.data.url} mb={1}>
            <Icon
              as={item.data.isReady ? CircleSlice8Icon : CircleOutlineIcon}
              color={item.data.isReady ? "green.500" : "red.500"}
            />
            <Text>{item.data.url}</Text>
            <Spacer />
            <Icon
              as={item.data.write ? SendCheckIcon : SendLockIcon}
              color={item.data.write ? "green.500" : "red.500"}
            />
            <Checkbox
              isChecked={item.isAssigned}
              onChange={() => toggleSelection(item.data.url, item.isAssigned)}
              isDisabled={item.data.write === false}
            ></Checkbox>
            {/* <Button
              onClick={() => toggleSelection(item.data.url, item.isAssigned)}
            >
              {item.isAssigned ? "Don't use" : "Use"}
            </Button> */}
          </HStack>
        ))
      )}
    </Box>
  );
}
