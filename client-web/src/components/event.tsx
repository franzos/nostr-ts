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
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  useDisclosure,
  ModalFooter,
  ModalHeader,
  ModalCloseButton,
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
import ThumbUpIcon from "mdi-react/ThumbUpIcon";
import ThumbDownIcon from "mdi-react/ThumbDownIcon";
import CurrencyBtcIcon from "mdi-react/CurrencyBtcIcon";
import ReplyIcon from "mdi-react/ReplyIcon";
import InformationOutlineIcon from "mdi-react/InformationOutlineIcon";
import RepeatIcon from "mdi-react/RepeatIcon";
import { unixTimeToRelative } from "../lib/relative-time";
import { excerpt } from "../lib/excerpt";
import { CreateEventForm } from "./create-event-form";
import { User } from "./user";

export interface EventProps {
  data: LightProcessedEvent;
  level: number;
}

export function Event({ data, level }: EventProps) {
  const [isReady] = useNClient((state) => [
    state.connected && state.keystore !== "none",
  ]);

  const toast = useToast();

  const [replies, setReplies] = useState<LightProcessedEvent[]>();

  const loadReplies = async () => {
    const evData = await useNClient
      .getState()
      .getEvent(data.event.id, "replies");
    if (evData && evData.replies) {
      setReplies(evData.replies);
    }
  };

  const hasContentWarning = eventHasContentWarning(data.event);
  const [showContent, setShowContent] = useState(
    hasContentWarning == undefined ? true : false
  );

  const images = data.event?.content?.match(
    /\bhttps?:\/\/\S+?\.(?:jpg|jpeg|png|gif)\b/gi
  );

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

    toast({
      title: "Error",
      description: `None of the required relays are active ${data.eventRelayUrls.join(
        ", "
      )}.`,
      status: "error",
      duration: 5000,
      isClosable: true,
    });
    return;
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

    try {
      const evId = await useNClient.getState().signAndSendEvent({
        event: ev,
        relayUrls: [relay.url],
      });
      if (evId) {
        toast({
          title: "Success",
          description: `Event ${excerpt(evId, 5)} submitted`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
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
      onReplyClose();
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

  const ActionButtons = ({ showAll }: { showAll: boolean }) => {
    return (
      <HStack>
        <Button
          size="xs"
          variant="outline"
          colorScheme="blue"
          leftIcon={<Icon as={ReplyIcon} />}
          onClick={() => (isReplyOpen ? onReplyClose() : onReplyOpen())}
          isDisabled={!isReady || level >= 1}
        >
          {data.repliesCount}
        </Button>
        <Button
          size="xs"
          variant="outline"
          aria-label="Upvote"
          leftIcon={<Icon as={ThumbUpIcon} />}
          onClick={() => newAction("reaction", "+")}
          isDisabled={!isReady}
        >
          {data.reactionsCount?.["+"] || 0}
        </Button>
        <Button
          size="xs"
          variant="outline"
          aria-label="Downvote"
          leftIcon={<Icon as={ThumbDownIcon} />}
          onClick={() => newAction("reaction", "-")}
          isDisabled={!isReady}
        >
          {data.reactionsCount?.["-"] || 0}
        </Button>
        <Button
          size="xs"
          variant="outline"
          aria-label="Repost"
          leftIcon={<Icon as={RepeatIcon} />}
          onClick={() => newAction("quote")}
          isDisabled={!isReady}
        >
          {data.repostsCount}
        </Button>
        <Button
          size="xs"
          variant="outline"
          aria-label="ZAP"
          leftIcon={<Icon as={CurrencyBtcIcon} />}
          isDisabled={!isReady}
        >
          {data.zapReceiptCount} ({data.zapReceiptAmount})
        </Button>
        {showAll &&
          filteredReactions &&
          Object.keys(filteredReactions)
            .slice(0, 4)
            .map((r) => (
              <Button size="xs" key={r} aria-label="Repost" isDisabled={true}>
                {r} {filteredReactions[r]}
              </Button>
            ))}
      </HStack>
    );
  };

  const EventModal = (
    <Modal isOpen={isEventModalOpen} onClose={onEventModalClose} size="xl">
      <ModalOverlay />
      <ModalContent maxHeight="80vh" maxWidth="80vw">
        <ModalHeader>Event</ModalHeader>
        <ModalCloseButton />
        <ModalBody overflowY="auto">
          <Text>Relay: {data.eventRelayUrls[0]}</Text>
          <Box m={4}>
            <pre>
              <code>{JSON.stringify(data.event, null, 2)}</code>
            </pre>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );

  const UserComponent = (
    <>
      {data.user && data.user.pubkey ? (
        <User
          user={data.user}
          options={{
            showFollowing: true,
            relayUrls: data.eventRelayUrls,
            showBlock: true,
          }}
        />
      ) : (
        <User
          user={{
            pubkey: data.event.pubkey,
          }}
          options={{
            relayUrls: data.eventRelayUrls,
            showBlock: true,
          }}
        />
      )}
    </>
  );

  const ImageModal = (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      closeOnOverlayClick={true}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{UserComponent}</ModalHeader>
        <ModalBody>
          <Image
            src={selectedImage || ""}
            fallback={<Image src="/no-image.png" />}
            fallbackStrategy="onError"
            alt="Enlarged view"
            height="80vh"
            marginLeft="auto"
            marginRight="auto"
          />
        </ModalBody>

        <ModalFooter>
          <ActionButtons showAll={true} />

          <Button marginLeft={4} onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );

  function makeLinksClickable(text: string) {
    if (!text) return "";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(
      urlRegex,
      (url) =>
        `<a href="${url}" target="_blank" class="is-inline">${excerpt(
          url,
          20
        )}</a>`
    );
  }

  const EventCard = (
    <Card style={{ overflowWrap: "break-word", wordWrap: "break-word" }}>
      <CardHeader p={0}>
        <Box>
          {showContent ? (
            images &&
            images.length > 0 && (
              <Box marginBottom={4}>
                {images.map((i, index) => (
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
          {UserComponent && (
            <Box p={4} paddingBottom={0}>
              {UserComponent}
            </Box>
          )}
        </Box>
      </CardHeader>
      <CardBody
        p={0}
        style={{ overflowWrap: "break-word", wordWrap: "break-word" }}
      >
        {showContent && (
          <Box
            pl={4}
            pr={4}
            pt={2}
            pb={2}
            background={"blackAlpha.100"}
            borderRadius={4}
            style={{ overflowWrap: "anywhere" }}
            dangerouslySetInnerHTML={{
              __html: makeLinksClickable(data.event.content),
            }}
          />
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
          <ActionButtons showAll={false} />

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
      {isReplyOpen && (
        <Box
          padding={4}
          marginBottom={2}
          marginTop={2}
          background="background"
          borderRadius={4}
        >
          <CreateEventForm
            isResponse={true}
            inResponseTo={data.event}
            relayUrls={data.eventRelayUrls}
            kind="NewShortTextNoteResponse"
            sendCallback={sendCallback}
          />
        </Box>
      )}
      {/* <HStack padding={2} flexWrap="wrap">
        {reactions && (
          <>
            <Text>Reactions</Text>
            {reactions.map((r, index) => {
              const user = r.user || { pubkey: r.event.pubkey };
              return (
                <Box key={`${index}_${r.event.id}_${user.pubkey}_reactions`}>
                  <UserIcon
                    user={user}
                    options={{
                      title: "Reaction",
                      showAbout: true,
                      showBanner: true,
                      relayUrls: eventRelayUrls,
                      reaction: r.event.content,
                      avatarSize: "xs",
                      lists: lists,
                    }}
                  />
                </Box>
              );
            })}
          </>
        )}
        {reposts && (
          <>
            <Text>Reposts</Text>
            {reposts.map((r, index) => {
              const user = r.user ? r.user : { pubkey: r.event.pubkey };
              return (
                <Box key={`${index}_${r.event.id}_${user.pubkey}_reposts`}>
                  <UserIcon
                    user={user}
                    options={{
                      title: "Repost",
                      showAbout: true,
                      showBanner: true,
                      relayUrls: eventRelayUrls,
                      avatarSize: "xs",
                      lists: lists,
                    }}
                  />
                  <Icon as={RepeatIcon} />
                </Box>
              );
            })}
          </>
        )}
        {
          // TODO: Relay urls
          mentions && (
            <>
              <Text>Mentions</Text>
              {mentions.map((u, index) => (
                <Box key={`${index}_${event.id}_${u.pubkey}_mention`}>
                  <UserIcon
                    user={u}
                    options={{
                      title: "Mentioned",
                      showAbout: true,
                      showBanner: true,
                      relayUrls: eventRelayUrls,
                      avatarSize: "xs",
                      lists: lists,
                    }}
                  />
                </Box>
              ))}
            </>
          )
        }
      </HStack>*/}

      {replies &&
        isReplyOpen &&
        replies.map((r) => {
          const user = r.user ? r.user : { pubkey: r.event.pubkey };
          return (
            <Box
              key={`${r.event.id}_${user.pubkey}_replies`}
              marginLeft={10}
              mb={1}
            >
              <Event data={r} level={level + 1} />
            </Box>
          );
        })}
      {ImageModal}
      {EventModal}
    </>
  );
}
