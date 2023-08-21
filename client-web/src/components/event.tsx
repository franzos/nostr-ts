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
} from "@chakra-ui/react";
import {
  NEvent,
  NEventWithUserBase,
  NewQuoteRepost,
  NewReaction,
  NewShortTextNoteResponse,
} from "@nostr-ts/common";
import { useNClient } from "../state/client";
import ThumbUpIcon from "mdi-react/ThumbUpIcon";
import ThumbDownIcon from "mdi-react/ThumbDownIcon";
import RepeatIcon from "mdi-react/RepeatIcon";
import { unixTimeToRelative } from "../lib/relative-time";

export interface EventProps extends NEventWithUserBase {
  userComponent?: JSX.Element;
}

export function Event({
  userComponent,
  event,
  reactions,
  reposts,
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
    setDownVotesCount(reactions?.filter((r) => r.content === "-").length || 0);
    setUpVotesCount(reactions?.filter((r) => r.content === "+").length || 0);
    setRepostsCount(reposts?.length || 0);
    setReactionsWithCount(
      reactions
        ?.filter((r) => r.content !== "+" && r.content !== "-")
        .reduce((acc, r) => {
          if (acc[r.content]) {
            acc[r.content] += 1;
          } else {
            acc[r.content] = 1;
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const openImage = (imageSrc: string) => {
    setSelectedImage(imageSrc);
    onOpen();
  };

  const newReply = () => {
    const ev = NewShortTextNoteResponse({
      text: "",
      inResponseTo: {
        id: event.id,
        pubkey: event.pubkey,
      },
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
      const evId = await useNClient.getState().signAndSendEvent(ev);
      if (evId) {
        toast({
          title: "Success",
          description: `Event ${evId} submitted`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        useNClient.getState().requestInformation("events", [event.id], {
          timeout: 10000,
        });
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

  return (
    <>
      <Card border="1px solid #e1e1e1" overflow="hidden">
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
          <Text>{event.content}</Text>
          <Text fontWeight="bold" fontSize={12} marginTop={2}>
            {unixTimeToRelative(event.created_at)}
          </Text>
        </CardBody>
        <CardFooter p={4}>
          <ActionButtons />
        </CardFooter>
      </Card>

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
    </>
  );
}
