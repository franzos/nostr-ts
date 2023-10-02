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
import {
  EventBase,
  EventBaseSigned,
  NEvent,
  WebSocketClientInfo,
} from "@nostr-ts/common";
import SendIcon from "mdi-react/SendIcon";
import { useNClient } from "../state/client";

import TextShortIcon from "mdi-react/TextShortIcon";
import TextLongIcon from "mdi-react/TextLongIcon";
import ReplyIcon from "mdi-react/ReplyIcon";
import WifiStarIcon from "mdi-react/WifiStarIcon";
import CogIcon from "mdi-react/CogIcon";
import RepeatIcon from "mdi-react/RepeatIcon";
import { excerpt } from "../lib/excerpt";
import { createNewEventForSubmission } from "../lib/new-event-for-submission";
import { NKIND } from "../lib/nkind";
import { RelaySelection } from "./relay-selection";
import { FileInput } from "./file-input";
import { FileUpload } from "./file-upload";
import { INTEGRATION_PROVIDER } from "../lib/integrations";

interface CreateEventFormProps {
  isResponse?: boolean;
  inResponseTo?: EventBaseSigned | undefined;
  relayUrls?: string[];
  kind?: NKIND;
  sendCallback?: (eventId: string) => void;
}

export const CreateEventForm = (props: CreateEventFormProps) => {
  const [isReady, keypairIsLoaded, hasStorageIntegration] = useNClient(
    (state) => [
      state.connected && state.keystore !== "none",
      state.keypairIsLoaded,
      state.integrations.filter(
        (i) => i.kind === INTEGRATION_PROVIDER.SATTELITE_CDN
      ).length > 0,
    ]
  );
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [isOptionsOpen, setOptionsOpen] = useState(false);

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

  const [files, setFiles] = useState<File[]>([]);

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

  /**
   * Initial load of relays
   */
  useEffect(() => {
    // Urls from props; for ex. event
    const relayUrls = props.relayUrls ? props.relayUrls : undefined;
    // Try to get the first relay url from the list
    const relayUrl = relayUrls && relayUrls.length > 0 ? relayUrls[0] : "";

    useNClient
      .getState()
      .getRelays()
      .then((r) => {
        if (r) {
          setRelays(
            r.map((item) => {
              if (
                (relayUrl === item.url && item.write) ||
                (item.isReady && item.write)
              ) {
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
  }, []);

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
    setIsBusy(true);
    setErrors([]);
    const relayUrls = relays.map((item) => item.data.url);
    if (relayUrls.length === 0) {
      handleError("Select at least one relay");
      setIsBusy(false);
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
      setIsBusy(false);
      return;
    }
    const event = newEvent.event as NEvent;
    const check = checkEvent(event);
    if (check?.error) {
      handleError(check.error);
      setIsBusy(false);
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
        setIsBusy(false);
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
      setIsBusy(false);
      return;
    }
  };

  const onFileSelection = (incomingFiles: FileList) => {
    console.log(incomingFiles);
    // Convert FileList to an array
    const newFilesArray: File[] = Array.from(incomingFiles);

    // Merge with existing files and remove duplicates
    const mergedFiles: File[] = Array.from(
      new Set([...files, ...newFilesArray])
    );
    console.log(mergedFiles);

    setFiles(mergedFiles);
  };

  const onFileRemoval = (file: File) => {
    setFiles(files.filter((f) => f.name !== file.name && f.size !== file.size));
  };

  const onFileUploadDone = (result: { url: string; nip94?: string[][] }) => {
    setEventContent(`${eventContent} ${result.url}`);
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

      {isOptionsOpen && (
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
      )}
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
      {files &&
        files.map((f) => (
          <FileUpload
            file={f}
            onUploadDone={onFileUploadDone}
            onRemove={onFileRemoval}
          />
        ))}
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
          Relays ({availableRelaysCount})
        </Button>
        <IconButton
          icon={<Icon as={CogIcon} />}
          variant="outline"
          onClick={() => setOptionsOpen((o) => !o)}
          aria-label="Options"
        />
        <FileInput
          onSelection={onFileSelection}
          isDisabled={!hasStorageIntegration}
        />
      </ButtonGroup>
    </Box>
  );
};
