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
} from "@nostr-ts/common";
import { useNClient } from "../state/client";
import InformationOutlineIcon from "mdi-react/InformationOutlineIcon";
import { unixTimeToRelative } from "../lib/relative-time";
import { excerpt } from "../lib/excerpt";
import { processEventContentFrontend } from "../lib/process-event-content";
import { EventUser } from "./event/user";
import { EventActionButtons } from "./event/action-buttons";
import { EventInfoModal } from "./event/info-modal";
import { EventContent } from "./event/content";
import { EventReplies } from "./event/replies";
import { EventBanner } from "./event/banner";
import { filterReactions } from "../lib/event-reactions-filter";

export interface EventProps {
  data: LightProcessedEvent;
  level: number;
}

export function Event({ data, level }: EventProps) {
  const [connected] = useNClient((state) => [
    state.connected && state.keystore !== "none",
  ]);

  const toast = useToast();

  const hasContentWarning = eventHasContentWarning(data.event);
  const [showContent, setShowContent] = useState(
    hasContentWarning == undefined ? true : false
  );

  const content = processEventContentFrontend(data);
  const filteredReactions = filterReactions(data.reactionsCount);

  const [replies, setReplies] = useState<LightProcessedEvent[]>();

  const {
    isOpen: isInfoModalOpen,
    onOpen: onInfoModalOpen,
    onClose: onInfoModalClose,
  } = useDisclosure();
  const {
    isOpen: isReplyOpen,
    onOpen: onReplyOpen,
    onClose: onReplyClose,
  } = useDisclosure();

  useEffect(() => {
    if (isReplyOpen) {
      loadReplies();
    }
  }, [isReplyOpen]);

  const loadReplies = async () => {
    const evData = await useNClient.getState().getEventReplies(data.event.id);
    if (evData) {
      setReplies(evData);
    }
  };

  const sendCallback = () => {
    onReplyClose();
  };

  const relatedRelay = async () => {
    if (!data.eventRelayUrls) return;
    const relays = (await useNClient.getState().getRelays()) || [];
    const relay = relays.find((r) => data.eventRelayUrls.includes(r.url));
    if (relay && relay.write) return relay;
  };

  const handleError = (e: Error | unknown) => {
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

    let ev: NEvent;

    switch (type) {
      case "quote":
        ev = NewQuoteRepost({
          inResponseTo: data.event,
          relayUrl: relay ? relay.url : undefined,
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
          relayUrl: relay ? relay.url : undefined,
        });
        break;
      default:
        return;
    }

    try {
      const evId = await useNClient.getState().signAndSendEvent({
        event: ev,
        relayUrls: relay ? [relay.url] : undefined,
      });
      if (evId) {
        handleSuccess(evId);
        setTimeout(() => {
          useNClient.getState().requestInformation(
            {
              source: "events",
              idsOrKeys: [evId],
            },
            {
              timeoutIn: 10000,
            }
          );
        }, 1000);
      }
    } catch (e) {
      handleError(e);
      return;
    }
  };

  const EventCard = (
    <Card>
      <CardHeader p={0}>
        <Box overflowWrap={"break-word"} wordBreak={"break-word"}>
          <EventBanner
            extractedContent={content}
            showContent={showContent}
            hasContentWarning={hasContentWarning}
            setShowContent={setShowContent}
          />
          <Box p={4} paddingBottom={0}>
            <EventUser data={data} />
          </Box>
        </Box>
      </CardHeader>
      <CardBody p={0}>
        {content && showContent && <EventContent content={content.text} />}
        <Box ml={4} overflowWrap={"break-word"} wordBreak={"break-word"}>
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
              onInfoModalOpen();
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
        isOpen={isInfoModalOpen}
        onClose={onInfoModalClose}
      />
    </>
  );
}
