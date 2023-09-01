import { useEffect, useRef, useState } from "react";
import {
  Box,
  FormControl,
  FormLabel,
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
import RepeatIcon from "mdi-react/RepeatIcon";
import { NUser } from "@nostr-ts/web";
import { User } from "./user";
import { excerpt } from "../lib/excerpt";

export const CreateEventForm = () => {
  const [isReady] = useNClient((state) => [
    state.connected && state.keystore !== "none",
  ]);
  const [errors, setErrors] = useState<string[]>([]);
  const [users, setUsers] = useState<
    {
      user: NUser;
      relayUrls: string[];
    }[]
  >([]);
  const [publicKeyTags] = useNClient((state) => [
    state.newEvent?.hasPublicKeyTags(),
  ]);
  const [isBusy, setBusy] = useState<boolean>(false);
  const [keystore, keypair, eventKind, newEventName, newEvent] = useNClient(
    (state) => [
      state.keystore,
      state.keypair,
      state.newEvent?.kind || 0,
      state.newEventName,
      state.newEvent,
    ]
  );

  const [eventContent, setEventContent] = useState<string>("");
  const [relayUrls, setRelayUrls] = useState<string[]>([]);
  const publicKey = useRef<string | undefined>(undefined);

  const toast = useToast();

  useEffect(() => {
    const loadUser = async () => {
      if (
        !publicKeyTags ||
        newEventName !== "NewShortTextNoteResponse" ||
        publicKeyTags[0][1] === publicKey.current
      ) {
        return;
      }

      const foundRelayUrls = [];
      if (publicKeyTags) {
        publicKey.current = publicKeyTags[0][1] || undefined;
        for (const tags of publicKeyTags) {
          // let relayUrl;
          /**
           * Get the relay url from the tags [p, pubkey, relayUrl]
           */
          if (tags.length === 2) {
            foundRelayUrls.push(tags[1]);
          }
        }
      }
      if (foundRelayUrls.length > 0) {
        setRelayUrls(foundRelayUrls);
      }
      setKind(newEventName, true);
    };
    loadUser();
  }, [publicKeyTags, newEventName]);

  const submit = async () => {
    setBusy(true);
    setErrors([]);
    if (!newEvent) {
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

    if (keystore && keystore === "none") {
      setErrors(["Keystore is required"]);
      toast({
        title: "Error",
        description: "Keystore is required",
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

    if (eventContent === "") {
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
      useNClient.getState().setNewEventContent(eventContent);
      const evId = await useNClient.getState().signAndSendEvent({
        event: newEvent,
        relayUrls,
      });
      if (evId) {
        toast({
          title: "Success",
          description: `Event ${excerpt(evId, 5)} submitted`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });

        const overwrite = true;
        const resetUser = true;
        setKind("NewShortTextNote", overwrite, resetUser);
        setBusy(false);
      }
    } catch (e) {
      let error = "";
      if (e instanceof Error) {
        error = e.message;
      } else {
        error = e ? e.toString() : "Unknown error";
      }
      setErrors([error]);
      toast({
        title: "Error",
        description: error,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setBusy(false);
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
      case "NewQuoteRepost":
        return "Quote Repost";
      default:
        return "";
    }
  };

  const setKind = (name: string, overwrite = false, resetUser = false) => {
    let event;
    if (!overwrite && name === newEventName) {
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
          relayUrl: Object.keys(DEFAULT_RELAYS)[0],
        });
        name = "NewRecommendRelay";
        break;
      case "NewLongFormContent":
        event = NewLongFormContent({
          text: "",
        });
        name = "NewLongFormContent";
        break;
      // case "NewQuoteRepost":
      //   console.log("TODO: NewQuoteRepost");
      //   // event = NewQuoteRepost({
      //   //   inResponseTo: useNClient.getState().newEvent,
      //   //   relayUrl: relayUrls[0],
      //   // });
      //   break;
      case "NewShortTextNoteResponse":
        event = useNClient.getState().newEvent;
        break;
      default:
        setErrors(["Invalid event type"]);
        return;
    }

    useNClient.getState().setNewEvent(event);
    useNClient.getState().setNewEventName(name);
    setErrors([]);
    if (resetUser) {
      setUsers([]);
    }
  };

  return (
    <Box width="100%">
      <FormControl marginBottom={4}>
        <FormLabel>Type: {translateNameToLabel(newEventName)}</FormLabel>

        {users.map((record) => (
          <User
            user={record.user}
            key={record.user.pubkey}
            options={{
              relayUrls: record.relayUrls,
            }}
          />
        ))}
      </FormControl>
      <FormControl marginBottom={4}>
        <FormLabel>Content</FormLabel>
        <Input
          type="text"
          as={eventKind === NEVENT_KIND.LONG_FORM_CONTENT ? Textarea : Input}
          value={eventContent}
          onChange={(e) => setEventContent(e.target.value)}
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
        <IconButton
          aria-label="NewQuoteRepost"
          icon={<Icon as={RepeatIcon} />}
          onClick={() => setKind("NewQuoteRepost")}
          isActive={newEventName === "NewQuoteRepost"}
          isDisabled={newEventName !== "NewQuoteRepost"}
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
        isDisabled={!isReady}
        isLoading={isBusy}
      >
        Send
      </Button>
    </Box>
  );
};
