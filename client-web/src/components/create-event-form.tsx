import { useState } from "react";
import {
  Box,
  FormControl,
  FormLabel,
  Text,
  Input,
  Button,
  useToast,
  Icon,
  Textarea,
  IconButton,
  HStack,
} from "@chakra-ui/react";
import {
  NEVENT_KIND,
  NewLongFormContent,
  NewRecommendRelay,
  NewShortTextNote,
} from "@nostr-ts/common";
import SendIcon from "mdi-react/SendIcon";
import { useNClient } from "../state/client";
import { DEFAULT_RELAYS } from "../defaults";

import TextShortIcon from "mdi-react/TextShortIcon";
import TextLongIcon from "mdi-react/TextLongIcon";
import ReplyIcon from "mdi-react/ReplyIcon";
import WifiStarIcon from "mdi-react/WifiStarIcon";

export const CreateEventForm = () => {
  const [connected] = useNClient((state) => [state.connected]);
  const [errors, setErrors] = useState<string[]>([]);
  const [keypair] = useNClient((state) => [state.keypair]);
  const [eventKind] = useNClient((state) => [state.newEvent?.kind || 0]);
  const [newEventName] = useNClient((state) => [state.newEventName]);
  // const [eventContent] = useNClient((state) => [state.newEvent?.content]);
  const toast = useToast();

  const submit = async () => {
    setErrors([]);
    const ev = useNClient.getState().newEvent;

    if (!ev) {
      setErrors(["Event is required"]);
      toast({
        title: "Error",
        description: "Event is required",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (!keypair) {
      setErrors(["Keypair is required"]);
      toast({
        title: "Error",
        description: "Keypair is required",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    if (!ev.content) {
      setErrors(["Event content is required"]);
      toast({
        title: "Error",
        description: "Event content is required",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      useNClient.getState().signAndSendEvent(ev);
    } catch (e) {
      setErrors([e.message]);
      toast({
        title: "Error",
        description: e.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }
  };

  const translateNameToLabel = (name: string) => {
    switch (name) {
      case "NewShortTextNote":
        return "Short Text Note";
      case "NewRecommendRelay":
        return "Recommend Relay";
      case "NewLongFormContent":
        return "Long Form Content";
      case "NewShortTextNoteResponse":
        return "Short Text Note Response";
      default:
        return "";
    }
  };

  const setKind = (name: string) => {
    let event;
    if (name === newEventName) {
      console.log(`Already set to ${name}`);
      return;
    }
    switch (name) {
      case "NewShortTextNote":
        event = NewShortTextNote({
          text: "",
        });
        name = "NewShortTextNote";
        break;
      case "NewRecommendRelay":
        event = NewRecommendRelay({
          relayUrl: DEFAULT_RELAYS[0],
        });
        name = "NewRecommendRelay";
        break;
      case "NewLongFormContent":
        event = NewLongFormContent({
          text: "",
        });
        name = "NewLongFormContent";
        break;
      default:
        setErrors(["Invalid event type"]);
        return;
    }

    useNClient.getState().setNewEvent(event);
    useNClient.getState().setNewEventName(name);
    setErrors([]);
  };

  const setContent = (content: string) => {
    const ev = useNClient.getState().newEvent;
    if (ev) {
      ev.content = content;
      useNClient.getState().setNewEvent(ev);
    }
  };

  return (
    <Box width="100%">
      <FormControl marginBottom={4}>
        <FormLabel>Type</FormLabel>

        <Text fontSize="xs">
          Selected: {translateNameToLabel(newEventName)}
        </Text>
      </FormControl>
      <FormControl marginBottom={4}>
        <FormLabel>Content</FormLabel>
        <Input
          type="text"
          as={eventKind === NEVENT_KIND.LONG_FORM_CONTENT ? Textarea : Input}
          value={useNClient.getState().newEvent?.content || ""}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter event content"
        />
      </FormControl>

      <HStack marginBottom={4}>
        <IconButton
          aria-label="Short Text Note"
          icon={<Icon as={TextShortIcon} />}
          onClick={() => setKind("NewShortTextNote")}
          isActive={newEventName === "NewShortTextNote"}
        ></IconButton>
        <IconButton
          aria-label="NewLongFormContent"
          icon={<Icon as={TextLongIcon} />}
          onClick={() => setKind("NewLongFormContent")}
          isActive={newEventName === "NewLongFormContent"}
        ></IconButton>
        <IconButton
          aria-label="NewShortTextNoteResponse"
          icon={<Icon as={ReplyIcon} />}
          onClick={() => setKind("NewShortTextNoteResponse")}
          isActive={newEventName === "NewShortTextNoteResponse"}
          isDisabled={newEventName !== "NewShortTextNoteResponse"}
        ></IconButton>
        <IconButton
          aria-label="NewRecommendRelay"
          icon={<Icon as={WifiStarIcon} />}
          onClick={() => setKind("NewRecommendRelay")}
          isActive={newEventName === "NewRecommendRelay"}
        ></IconButton>
      </HStack>
      {errors.map((error, index) => (
        <Box key={index} color="red.500">
          {error}
        </Box>
      ))}
      <Button
        type="submit"
        colorScheme="blue"
        onClick={submit}
        leftIcon={<Icon as={SendIcon} />}
        isDisabled={!connected}
      >
        Send
      </Button>
    </Box>
  );
};
