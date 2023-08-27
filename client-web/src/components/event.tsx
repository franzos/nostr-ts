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
} from "@chakra-ui/react";
import {
  NEvent,
  ProcessedEvent,
  NewQuoteRepost,
  NewReaction,
  NewShortTextNoteResponse,
} from "@nostr-ts/common";
import { useNClient } from "../state/client";
import ThumbUpIcon from "mdi-react/ThumbUpIcon";
import ThumbDownIcon from "mdi-react/ThumbDownIcon";
import RepeatIcon from "mdi-react/RepeatIcon";
import { unixTimeToRelative } from "../lib/relative-time";
import { excerpt } from "../lib/excerpt";
import { UserIcon } from "./user-icon";

export interface EventProps extends ProcessedEvent {
  userComponent?: JSX.Element;
}

export function Event({
  userComponent,
  event,
  reactions,
  reposts,
  mentions,
  replies,
  eventRelayUrls,
}: EventProps) {
  const [isReady] = useNClient((state) => [
    state.connected && state.keystore !== "none",
  ]);

  const toast = useToast();

  const [upVotesCount, setUpVotesCount] = useState(0);
  const [downVotesCount, setDownVotesCount] = useState(0);
  const [repostsCount, setRepostsCount] = useState(0);
  const [reactionsWithCount, setReactionsWithCount] = useState<{
    [key: string]: number;
  }>({});

  useEffect(() => {
    setDownVotesCount(
      reactions?.filter((r) => r.event.content === "-").length || 0
    );
    setUpVotesCount(
      reactions?.filter((r) => r.event.content === "+").length || 0
    );
    setRepostsCount(reposts?.length || 0);
    setReactionsWithCount(
      reactions
        ?.filter((r) => r.event.content !== "+" && r.event.content !== "-")
        .reduce((acc, r) => {
          const content = r.event?.content ? r.event.content : undefined;
          if (content && acc[content]) {
            acc[content] += 1;
          } else if (content) {
            acc[content] = 1;
          }
          return acc;
        }, {} as { [key: string]: number }) || {}
    );
  }, [reactions]);

  const images = event?.content?.match(
    /\bhttps?:\/\/\S+?\.(?:jpg|jpeg|png|gif)\b/gi
  );

  // Image handling
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isEventModalOpen,
    onOpen: onEventModalOpen,
    onClose: onEventModalClose,
  } = useDisclosure();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const openImage = (imageSrc: string) => {
    setSelectedImage(imageSrc);
    onOpen();
  };

  const newReply = async () => {
    const relays = await useNClient.getState().getRelays();
    // TODO: Select relay related to event
    const relay = relays.find((r) => r.url === eventRelayUrls[0]);
    if (!relay) {
      toast({
        title: "Error",
        description: `Relay ${eventRelayUrls[0]} not found`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    const ev = NewShortTextNoteResponse({
      text: "",
      inResponseTo: {
        id: event.id,
        pubkey: event.pubkey,
      },
      relayUrl: relay.url,
    });
    useNClient.getState().setNewEvent(ev);
    useNClient.getState().setNewEventName("NewShortTextNoteResponse");
  };

  /**
   * Quote or react to an event
   */
  const newAction = async (type: "quote" | "reaction", reaction?: string) => {
    let ev: NEvent;

    switch (type) {
      case "quote":
        ev = NewQuoteRepost({
          inResponseTo: event,
          relayUrl: "",
        });
        break;
      case "reaction":
        if (!reaction) throw new Error("Reaction is required");
        ev = NewReaction({
          text: reaction,
          inResponseTo: {
            id: event.id,
            pubkey: event.pubkey,
          },
        });
        break;
      default:
        return;
    }

    try {
      const evId = await useNClient.getState().signAndSendEvent({
        event: ev,
      });
      if (evId) {
        toast({
          title: "Success",
          description: `Event ${excerpt(evId, 5)} submitted`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        useNClient.getState().requestInformation(
          {
            source: "events",
            idsOrKeys: [evId],
            relayUrl: eventRelayUrls[0],
          },
          {
            timeout: 10000,
            timeoutAt: Date.now() + 10000,
          }
        );
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

  const ActionButtons = () => {
    return (
      <HStack>
        <Button
          size="sm"
          variant="solid"
          colorScheme="blue"
          onClick={() => newReply()}
          isDisabled={!isReady}
        >
          Reply
        </Button>
        <Button
          size="sm"
          aria-label="Upvote"
          leftIcon={<Icon as={ThumbUpIcon} />}
          onClick={() => newAction("reaction", "+")}
          isDisabled={!isReady}
        >
          {upVotesCount}
        </Button>
        <Button
          size="sm"
          aria-label="Downvote"
          leftIcon={<Icon as={ThumbDownIcon} />}
          onClick={() => newAction("reaction", "-")}
          isDisabled={!isReady}
        >
          {downVotesCount}
        </Button>
        <Button
          size="sm"
          aria-label="Repost"
          leftIcon={<Icon as={RepeatIcon} />}
          onClick={() => newAction("quote")}
          isDisabled={!isReady}
        >
          {repostsCount}
        </Button>
        {reactionsWithCount &&
          Object.keys(reactionsWithCount).map((r) => (
            <Button size="sm" key={r} aria-label="Repost" isDisabled={true}>
              {r} {reactionsWithCount[r]}
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
          <pre>
            <code>{JSON.stringify(event, null, 2)}</code>
          </pre>
        </ModalBody>
      </ModalContent>
    </Modal>
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
        <ModalHeader>{userComponent && userComponent}</ModalHeader>
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
          <ActionButtons />

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
    <Card
      border="1px solid #e1e1e1"
      style={{ overflowWrap: "break-word", wordWrap: "break-word" }}
    >
      <CardHeader p={0}>
        <Box>
          {images && images?.length > 0 && (
            <Box className="image-container" marginBottom={4}>
              {images.map((i, index) => (
                <Image
                  key={index}
                  src={i}
                  fallback={<Image src="/no-image.png" />}
                  fallbackStrategy="onError"
                  alt=""
                  onClick={() => openImage(i)}
                />
              ))}
            </Box>
          )}
          <Box p={4} paddingBottom={0}>
            {userComponent && userComponent}
          </Box>
        </Box>
      </CardHeader>
      <CardBody p={4}>
        <Box
          style={{ overflowWrap: "anywhere" }}
          dangerouslySetInnerHTML={{
            __html: makeLinksClickable(event.content),
          }}
        />
        <Text fontWeight="bold" fontSize={12} marginTop={2}>
          {unixTimeToRelative(event.created_at)}
        </Text>
      </CardBody>
      <CardFooter p={4}>
        <HStack width="100%">
          <ActionButtons />

          <Spacer />
          <Text>{eventRelayUrls[0]}</Text>

          <Button
            size={"sm"}
            variant="outline"
            onClick={() => {
              onEventModalOpen();
            }}
          >
            Details
          </Button>
        </HStack>
      </CardFooter>
    </Card>
  );

  return (
    <>
      {EventCard}
      <HStack padding={2} flexWrap="wrap">
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
            {reposts.map((r) => {
              const user = r.user ? r.user : { pubkey: r.event.pubkey };
              return (
                <Box key={`${r.event.id}_${user.pubkey}_reposts`}>
                  <UserIcon
                    user={user}
                    options={{
                      title: "Repost",
                      showAbout: true,
                      showBanner: true,
                      relayUrls: eventRelayUrls,
                      avatarSize: "xs",
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
              {mentions.map((u) => (
                <Box key={`${event.id}_${u.pubkey}_mention`}>
                  <UserIcon
                    user={u}
                    options={{
                      title: "Mentioned",
                      showAbout: true,
                      showBanner: true,
                      relayUrls: eventRelayUrls,
                      avatarSize: "xs",
                    }}
                  />
                </Box>
              ))}
            </>
          )
        }
      </HStack>

      {replies &&
        replies.map((r) => {
          const user = r.user ? r.user : { pubkey: r.event.pubkey };
          return (
            <Box key={`${r.event.id}_${user.pubkey}_replies`} marginLeft={10}>
              <Event
                event={r.event}
                userComponent={
                  <UserIcon
                    user={user}
                    // TODO: More accurate
                    options={{
                      relayUrls: eventRelayUrls,
                    }}
                  />
                }
                eventRelayUrls={eventRelayUrls}
              />
            </Box>
          );
        })}
      {ImageModal}
      {EventModal}
    </>
  );
}
