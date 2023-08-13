import React, { useState } from "react";
import {
  Box,
  FormControl,
  FormLabel,
  Select,
  Input,
  Button,
  useToast,
} from "@chakra-ui/react";
import {
  NewLongFormContent,
  NewRecommendRelay,
  NewShortTextNote,
} from "@nostr-ts/common";
import { useNClient } from "../state/client";

export const CreateEventForm = () => {
  const [eventType, setEventType] = useState("");
  const [eventContent, setEventContent] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [keypair] = useNClient((state) => [state.keypair]);
  const toast = useToast();

  const submit = () => {
    setErrors([]);
    if (eventType === "") {
      setErrors(["Event type is required"]);
      toast({
        title: "Error",
        description: "Event type is required",
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
    let event;

    switch (eventType) {
      case "1":
        event = NewShortTextNote({
          text: eventContent,
        });
        break;
      case "2":
        event = NewRecommendRelay({
          relayUrl: eventContent,
        });
        break;
      case "30023":
        event = NewLongFormContent({
          text: eventContent,
        });
        break;
      default:
        setErrors(["Invalid event type"]);
        return;
    }

    try {
      event.signAndGenerateId(keypair);
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

    try {
      useNClient.getState().sendEvent(event);
      toast({
        title: "Event sent",
        description: `Event ${event.id} sent`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } catch (e) {
      toast({
        title: "Error",
        description: `Error sending event ${event.id}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Box width="100%">
      <FormControl marginBottom={4}>
        <FormLabel>Type</FormLabel>
        <Select
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          placeholder="Select event type"
        >
          <option value="1">Short Text Note</option>
          <option value="2">Recommend Relay</option>
          <option value="30023">Long Form Content</option>
        </Select>
      </FormControl>

      <FormControl marginBottom={4}>
        <FormLabel>Content</FormLabel>
        <Input
          type="text"
          value={eventContent}
          onChange={(e) => setEventContent(e.target.value)}
          placeholder="Enter event content"
        />
      </FormControl>

      {errors.map((error, index) => (
        <Box key={index} color="red.500">
          {error}
        </Box>
      ))}

      <Button type="submit" colorScheme="blue" onClick={submit}>
        Create Event
      </Button>
    </Box>
  );
};
