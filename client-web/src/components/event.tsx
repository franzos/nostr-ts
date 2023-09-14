import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Text,
  Button,
  Box,
  Icon,
  useToast,
  HStack,
  Image,
  useDisclosure,
  Spacer,
  IconButton,
} from "@chakra-ui/react";
import {
  NEvent,
  NewQuoteRepost,
  NewReaction,
  eventHasContentWarning,
  LightProcessedEvent,
  ReactionsCount,
} from "@nostr-ts/common";
import { useNClient } from "../state/client";
import InformationOutlineIcon from "mdi-react/InformationOutlineIcon";
import { unixTimeToRelative } from "../lib/relative-time";
import { excerpt } from "../lib/excerpt";
import { processEventContentFrontend } from "../lib/process-event-content";
import { EventUser } from "./event/user";
import { EventActionButtons } from "./event/action-buttons";
import { EventInfoModal } from "./event/info-modal";
import { EventImageModal } from "./event/image-modal";
import { EventContent } from "./event/content";
import { EventReplies } from "./event/replies";

export interface EventProps {
  data: LightProcessedEvent;
  level: number;
}

export function Event({ data, level }: EventProps) {
  const [connected] = useNClient((state) => [
    state.connected && state.keystore !== "none",
  ]);

  const toast = useToast();

  const [replies, setReplies] = useState<LightProcessedEvent[]>();

  const loadReplies = async () => {
    const evData = await useNClient.getState().getEventReplies(data.event.id);
    if (evData) {
      setReplies(evData);
    }
    // TODO: Currently useless because assignment is not implemented
    // await useNClient.getState().requestInformation(
    //   {
    //     source: "events",
    //     idsOrKeys: [data.event.id],
    //     relayUrl: data.eventRelayUrls[0],
    //   },
    //   {
    //     timeoutIn: 5000,
    //   }
    // );
  };

  const hasContentWarning = eventHasContentWarning(data.event);
  const [showContent, setShowContent] = useState(
    hasContentWarning == undefined ? true : false
  );

  const content = processEventContentFrontend(data);
  const hasContent = content.content !== "";

  // Image handling
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isEventModalOpen,
    onOpen: onEventModalOpen,
    onClose: onEventModalClose,
  } = useDisclosure();
  const {
    isOpen: isReplyOpen,
    onOpen: onReplyOpen,
    onClose: onReplyClose,
  } = useDisclosure();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (isReplyOpen) {
      loadReplies();
    }
  }, [isReplyOpen]);

  const openImage = (imageSrc: string) => {
    setSelectedImage(imageSrc);
    onOpen();
  };

  const sendCallback = () => {
    onReplyClose();
  };

  const relatedRelay = async () => {
    const relays = (await useNClient.getState().getRelays()) || [];
    const relay = relays.find((r) => data.eventRelayUrls.includes(r.url));
    if (relay) return relay;
  };

  const handleError = (e: Error) => {
    let error = "";
    if (e instanceof Error) {
      error = e.message;
    } else {
      error = "Unknown error";
    }
    toast({
      title: "Error",
      description: error,
      status: "error",
      duration: 5000,
      isClosable: true,
    });
  };

  const handleSuccess = (evId: string) => {
    toast({
      title: "Success",
      description: `Event ${excerpt(evId, 5)} submitted`,
      status: "success",
      duration: 5000,
      isClosable: true,
    });
  };

  /**
   * Quote or react to an event
   */
  const newAction = async (type: "quote" | "reaction", reaction?: string) => {
    const relay = await relatedRelay();
    if (!relay) {
      return;
    }

    let ev: NEvent;

    switch (type) {
      case "quote":
        ev = NewQuoteRepost({
          inResponseTo: data.event,
          relayUrl: relay.url,
        });
        break;
      case "reaction":
        if (!reaction) throw new Error("Reaction is required");
        ev = NewReaction({
          text: reaction,
          inResponseTo: {
            id: data.event.id,
            pubkey: data.event.pubkey,
          },
          relayUrl: relay.url,
        });
        break;
      default:
        return;
    }

    const relayIsRelay = relay.isReady && relay.write;
    if (!relayIsRelay) {
      handleError(new Error("Relay is not ready"));
    }

    try {
      const evId = await useNClient.getState().signAndSendEvent({
        event: ev,
        relayUrls: relayIsRelay ? [relay.url] : undefined,
      });
      if (evId) {
        handleSuccess(evId);
        setTimeout(() => {
          useNClient.getState().requestInformation(
            {
              source: "events",
              idsOrKeys: [evId],
              relayUrl: data.eventRelayUrls[0],
            },
            {
              timeoutIn: 10000,
            }
          );
        }, 1000);
      }
    } catch (e) {
      let error = "";
      if (e instanceof Error) {
        error = e.message;
      } else {
        error = e ? e.toString() : "Unknown error";
      }
      toast({
        title: "Error",
        description: error,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }
  };

  const filterReactions = (obj?: ReactionsCount) => {
    if (!obj) return {};
    return Object.keys(obj)
      .filter((key) => key !== "+" && key !== "-")
      .reduce((newObj: ReactionsCount, key) => {
        newObj[key] = obj[key];
        return newObj;
      }, {});
  };

  const filteredReactions = filterReactions(data.reactionsCount);

  const EventCard = (
    <Card style={{ overflowWrap: "break-word", wordWrap: "break-word" }}>
      <CardHeader p={0}>
        <Box style={{ overflowWrap: "break-word", wordWrap: "break-word" }}>
          {showContent ? (
            content.images &&
            content.images.length > 0 && (
              <Box marginBottom={4}>
                {content.images.map((i, index) => (
                  <Image
                    width={"100%"}
                    key={index}
                    src={i}
                    fallback={<Image src="/no-image.png" />}
                    fallbackStrategy="onError"
                    alt=""
                    onClick={() => openImage(i)}
                  />
                ))}
              </Box>
            )
          ) : (
            <Button size="sm" width="100%" onClick={() => setShowContent(true)}>
              Show Content ({hasContentWarning})
            </Button>
          )}
          <Box p={4} paddingBottom={0}>
            <EventUser data={data} />
          </Box>
        </Box>
      </CardHeader>
      <CardBody p={0}>
        {hasContent && showContent && (
          <EventContent content={content.content} />
        )}
        <Box
          ml={4}
          style={{ overflowWrap: "break-word", wordWrap: "break-word" }}
        >
          {filteredReactions &&
            Object.keys(filteredReactions).map((r) => (
              <Button
                size="xs"
                variant="outline"
                key={r}
                aria-label="Repost"
                isDisabled={true}
                m={0.5}
              >
                {r} {filteredReactions[r]}
              </Button>
            ))}
        </Box>
      </CardBody>
      <CardFooter pl={4} pr={4} pt={2} pb={2}>
        <HStack width="100%">
          <EventActionButtons
            data={data}
            isReady={connected}
            isReplyOpen={isReplyOpen}
            onReplyOpen={onReplyOpen}
            onReplyClose={onReplyClose}
            newAction={newAction}
            level={level}
            showAll={false}
            filteredReactions={filteredReactions}
          />

          <Spacer />
          <Text fontSize={12}>{unixTimeToRelative(data.event.created_at)}</Text>
          <IconButton
            aria-label="Event info"
            size={"xs"}
            variant="outline"
            icon={<Icon as={InformationOutlineIcon} />}
            onClick={() => {
              onEventModalOpen();
            }}
          ></IconButton>
        </HStack>
      </CardFooter>
    </Card>
  );

  return (
    <>
      {EventCard}
      <EventReplies
        data={data}
        replies={replies}
        isReplyOpen={isReplyOpen}
        sendCallback={sendCallback}
        level={level}
      />
      <EventInfoModal
        data={data}
        isEventModalOpen={isEventModalOpen}
        onEventModalClose={onEventModalClose}
      />
      <EventImageModal
        data={data}
        isOpen={isOpen}
        onClose={onClose}
        selectedImage={selectedImage}
        isReady={connected}
        isReplyOpen={isReplyOpen}
        onReplyOpen={onReplyOpen}
        onReplyClose={onReplyClose}
        newAction={newAction}
        level={level}
        showAll={true}
        filteredReactions={filteredReactions}
      />
    </>
  );
}
