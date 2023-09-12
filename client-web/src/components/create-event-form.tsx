import { useEffect, useState } from "react";
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
  useDisclosure,
  ButtonGroup,
} from "@chakra-ui/react";
import { EventBase, NEvent, WebSocketClientInfo } from "@nostr-ts/common";
import SendIcon from "mdi-react/SendIcon";
import { useNClient } from "../state/client";

import TextShortIcon from "mdi-react/TextShortIcon";
import TextLongIcon from "mdi-react/TextLongIcon";
import ReplyIcon from "mdi-react/ReplyIcon";
import WifiStarIcon from "mdi-react/WifiStarIcon";
import RepeatIcon from "mdi-react/RepeatIcon";
import { excerpt } from "../lib/excerpt";
import { createNewEventForSubmission } from "../lib/new-event-for-submission";
import { NKIND } from "../lib/nkind";
import { RelaySelection } from "./relay-selection";

interface CreateEventFormProps {
  isResponse?: boolean;
  inResponseTo?: NEvent | undefined;
  relayUrls?: string[];
  kind?: NKIND;
  sendCallback?: (eventId: string) => void;
}

export const CreateEventForm = (props: CreateEventFormProps) => {
  const [isReady, keypairIsLoaded] = useNClient((state) => [
    state.connected && state.keystore !== "none",
    state.keypairIsLoaded,
  ]);
  const [isBusy, setBusy] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [keystore, keypair] = useNClient((state) => [
    state.keystore,
    state.keypair,
  ]);

  const message =
    isReady || keypairIsLoaded
      ? undefined
      : "Login and connect to send events.";

  /**
   * Event data
   */
  const [eventKind, setEventKind] = useState<NKIND>(
    props.kind || "NewShortTextNote"
  );
  const [eventContent, setEventContent] = useState<string>("");

  const options = [
    {
      label: "NewShortTextNote",
      icon: <Icon as={TextShortIcon} />,
      disabled: props.isResponse || false,
    },
    {
      label: "NewLongFormContent",
      icon: <Icon as={TextLongIcon} />,
      disabled: props.isResponse || false,
    },
    {
      label: "NewShortTextNoteResponse",
      icon: <Icon as={ReplyIcon} />,
      disabled: eventKind !== "NewShortTextNoteResponse",
    },
    {
      label: "NewRecommendRelay",
      icon: <Icon as={WifiStarIcon} />,
      disabled: props.isResponse || false,
    },
    {
      label: "NewQuoteRepost",
      icon: <Icon as={RepeatIcon} />,
      disabled: eventKind !== "NewQuoteRepost",
    },
  ] as {
    label: NKIND;
    icon: JSX.Element;
    disabled?: boolean;
  }[];

  const toast = useToast();

  // Relay selection
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [relays, setRelays] = useState<
    {
      data: WebSocketClientInfo;
      isAssigned: boolean;
    }[]
  >([]);

  const availableRelaysCount = relays.filter((item) => item.isAssigned).length;

  const onRelaySelection = (url: string, action: "add" | "remove") => {
    setRelays(
      relays.map((item) => {
        if (item.data.url === url) {
          return {
            ...item,
            isAssigned: action === "add" ? true : false,
          };
        }
        return item;
      })
    );
  };

  useEffect(() => {
    // Urls from props; for ex. event
    const relayUrls = props.relayUrls ? props.relayUrls : undefined;
    // Try to get the first relay url from the list
    const relayUrl = relayUrls && relayUrls.length > 0 ? relayUrls[0] : "";

    console.log("relayUrls", relayUrls);

    if (isOpen) {
      useNClient
        .getState()
        .getRelays()
        .then((r) => {
          if (r) {
            setRelays(
              r.map((item) => {
                if (relayUrl === item.url) {
                  return {
                    data: item,
                    isAssigned: true,
                  };
                }
                return {
                  data: item,
                  isAssigned: false,
                };
              })
            );
          }
        });
    }
  }, [isOpen]);

  /**
   * Check environment for errors
   */
  const checkEvent = (event: EventBase) => {
    if (event.content === "") {
      return {
        error: "Event content is required",
      };
    }
    if (keystore && keystore === "none") {
      return {
        error: "Keystore is required",
      };
    }
    if (!keypair) {
      return {
        error: "Keypair is required",
      };
    }
    return undefined;
  };

  const reset = () => {
    setEventContent("");
    setEventKind("NewShortTextNote");
    setErrors([]);
  };

  const handleError = (error: string) => {
    setErrors([error]);
    toast({
      title: "Error",
      description: error,
      status: "error",
      duration: 5000,
      isClosable: true,
    });
  };

  const handleSuccess = (message: string) => {
    toast({
      title: "Success",
      description: message,
      status: "success",
      duration: 5000,
      isClosable: true,
    });
  };

  /**
   * Submit event
   */
  const submit = async () => {
    setBusy(true);
    setErrors([]);
    const relayUrls = relays.map((item) => item.data.url);
    if (relayUrls.length === 0) {
      handleError("Select at least one relay");
      return;
    }
    const newEvent = createNewEventForSubmission(
      eventKind,
      eventContent,
      relayUrls[0],
      props
    );
    if (newEvent.error) {
      handleError(newEvent.error);
      return;
    }
    const event = newEvent.event as NEvent;
    const check = checkEvent(event);
    if (check?.error) {
      handleError(check.error);
      return;
    }

    try {
      const evId = await useNClient.getState().signAndSendEvent({
        event,
        relayUrls,
      });
      if (evId) {
        handleSuccess(`Event sent: ${excerpt(event.content, 20)}`);

        reset();
        setBusy(false);
        if (props.sendCallback) {
          props.sendCallback(evId);
        }
      }
    } catch (e) {
      let error = "";
      if (e instanceof Error) {
        error = e.message;
      } else {
        error = e ? e.toString() : "Unknown error";
      }
      handleError(error);
      setBusy(false);
      return;
    }
  };

  /**
   * Render
   */
  return (
    <Box width="100%">
      <FormControl marginBottom={4}>
        <FormLabel>Content</FormLabel>
        <Input
          type="text"
          as={eventKind === "NewLongFormContent" ? Textarea : Input}
          value={eventContent}
          onChange={(e) => setEventContent(e.target.value)}
          placeholder="Enter event content"
        />
      </FormControl>

      <HStack marginBottom={4}>
        {options.map((option) => (
          <IconButton
            variant={"outline"}
            key={option.label}
            aria-label={option.label}
            icon={option.icon}
            onClick={() => setEventKind(option.label)}
            isActive={eventKind === option.label}
            isDisabled={option.disabled}
          ></IconButton>
        ))}
      </HStack>
      {errors.map((error, index) => (
        <Box key={index} color="red.500">
          {error}
        </Box>
      ))}
      {message && (
        <Box color="red.500" paddingBottom={2}>
          {message}
        </Box>
      )}
      {isOpen && <RelaySelection relays={relays} onChange={onRelaySelection} />}
      <ButtonGroup>
        <Button
          type="submit"
          variant={"solid"}
          onClick={submit}
          leftIcon={<Icon as={SendIcon} />}
          isDisabled={!isReady || availableRelaysCount === 0}
          isLoading={isBusy}
        >
          Send
        </Button>
        <Button variant={"outline"} onClick={isOpen ? onClose : onOpen}>
          Select relays ({availableRelaysCount})
        </Button>
      </ButtonGroup>
    </Box>
  );
};
