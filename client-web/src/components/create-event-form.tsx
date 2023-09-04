import { useState } from "react";
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
  EventBase,
  NEvent,
  NewLongFormContent,
  NewQuoteRepost,
  NewRecommendRelay,
  NewShortTextNote,
  NewShortTextNoteResponse,
} from "@nostr-ts/common";
import SendIcon from "mdi-react/SendIcon";
import { useNClient } from "../state/client";

import TextShortIcon from "mdi-react/TextShortIcon";
import TextLongIcon from "mdi-react/TextLongIcon";
import ReplyIcon from "mdi-react/ReplyIcon";
import WifiStarIcon from "mdi-react/WifiStarIcon";
import RepeatIcon from "mdi-react/RepeatIcon";
import { excerpt } from "../lib/excerpt";

type NKIND =
  | "NewShortTextNote"
  | "NewLongFormContent"
  | "NewShortTextNoteResponse"
  | "NewRecommendRelay"
  | "NewQuoteRepost";

interface CreateEventFormProps {
  isResponse?: boolean;
  inResponseTo?: NEvent | undefined;
  relayUrls?: string[];
  kind?: NKIND;
}

export const CreateEventForm = (props: CreateEventFormProps) => {
  const [isReady] = useNClient((state) => [
    state.connected && state.keystore !== "none",
  ]);
  const [isBusy, setBusy] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [keystore, keypair] = useNClient((state) => [
    state.keystore,
    state.keypair,
  ]);

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

  const relayUrls = props.relayUrls ? props.relayUrls : [];

  /**
   * Create event from inputs
   */
  const assembleEvent = (): {
    event?: NEvent;
    error?: string;
  } => {
    switch (eventKind) {
      case "NewShortTextNote":
        return {
          event: NewShortTextNote({
            text: eventContent,
          }),
        };
      case "NewLongFormContent":
        return {
          event: NewLongFormContent({
            text: eventContent,
          }),
        };
      case "NewShortTextNoteResponse":
        if (!props.inResponseTo) {
          return {
            error: "Response requires inResponseTo",
          };
        }
        return {
          event: NewShortTextNoteResponse({
            text: eventContent,
            inResponseTo: props.inResponseTo,
          }),
        };
      case "NewRecommendRelay":
        return {
          event: NewRecommendRelay({
            relayUrl: relayUrls[0],
          }),
        };
      case "NewQuoteRepost":
        if (!props.inResponseTo) {
          return {
            error: "Quote repost requires inResponseTo",
          };
        }
        return {
          event: NewQuoteRepost({
            inResponseTo: props.inResponseTo,
            relayUrl: relayUrls[0],
          }),
        };
      default:
        return {
          error: "Invalid event type",
        };
    }
  };

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

  const submit = async () => {
    setBusy(true);
    setErrors([]);
    const assem = assembleEvent();
    if (assem.error) {
      setErrors([assem.error]);
      toast({
        title: "Error",
        description: assem.error,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    const event = assem.event as NEvent;
    const check = checkEvent(event);
    if (check?.error) {
      setErrors([check.error]);
      toast({
        title: "Error",
        description: check.error,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      const evId = await useNClient.getState().signAndSendEvent({
        event,
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

        reset();
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

  // const translateNameToLabel = (name: string) => {
  //   switch (name) {
  //     case "NewShortTextNote":
  //       return "Short Text Note";
  //     case "NewRecommendRelay":
  //       return "Recommend Relay";
  //     case "NewLongFormContent":
  //       return "Long Form Content";
  //     case "NewShortTextNoteResponse":
  //       return "Short Text Note Response";
  //     case "NewQuoteRepost":
  //       return "Quote Repost";
  //     default:
  //       return "";
  //   }
  // };

  return (
    <Box width="100%">
      {/* <FormControl marginBottom={4}>
        <FormLabel>Type: {translateNameToLabel(eventKind)}</FormLabel>
      </FormControl> */}
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
      <Button
        type="submit"
        variant={"solid"}
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
