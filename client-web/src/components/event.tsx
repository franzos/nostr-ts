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
} from "@chakra-ui/react";
import {
  NEventWithUserBase,
  NewReaction,
  NewShortTextNoteResponse,
} from "@nostr-ts/common";
import { useNClient } from "../state/client";
import { User } from "./user";
import ThumbUpIcon from "mdi-react/ThumbUpIcon";
import ThumbDownIcon from "mdi-react/ThumbDownIcon";
import RepeatIcon from "mdi-react/RepeatIcon";
import { unixTimeToRelative } from "../lib/relative-time";
import { useState } from "react";

export function Event({ user, event, reactions, reposts }: NEventWithUserBase) {
  const toast = useToast();

  const downVotesCount =
    reactions?.filter((r) => r.content === "-").length || 0;
  const upVotesCount = reactions?.filter((r) => r.content === "+").length || 0;
  const repostsCount = reposts?.length || 0;
  const reactionsWithCount = reactions
    ?.filter((r) => r.content !== "+" && r.content !== "-")
    .reduce((acc, r) => {
      if (acc[r.content]) {
        acc[r.content] += 1;
      } else {
        acc[r.content] = 1;
      }
      return acc;
    }, {} as { [key: string]: number });

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

  const newReaction = (reaction: "+" | "-") => {
    const ev = NewReaction({
      text: reaction,
      inResponseTo: {
        id: event.id,
        pubkey: event.pubkey,
      },
    });

    try {
      const reactionId = useNClient.getState().signAndSendEvent(ev);
      if (reactionId) {
        toast({
          title: "Success",
          description: "Reaction sent",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        useNClient.getState().getEventInformation([event.id], {
          skipFilter: true,
          timeout: 10000,
        });
      }
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: e.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Card border="1px solid #e1e1e1" overflow="hidden">
      <CardHeader p={0}>
        <Box>
          {images && images?.length > 0 && (
            <Box className="image-container" marginBottom={4}>
              {images.map((i, index) => (
                <Image
                  key={index}
                  src={i}
                  alt=""
                  onClick={() => openImage(i)}
                />
              ))}
            </Box>
          )}
          <Box p={4}>
            {user ? (
              <User user={user} />
            ) : (
              <User
                user={{
                  pubkey: event.pubkey,
                }}
              />
            )}
          </Box>
        </Box>
        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalBody>
              <Image
                src={selectedImage}
                alt="Enlarged view"
                maxW="100%"
                maxH="100%"
                objectFit="contain"
              />
            </ModalBody>
          </ModalContent>
        </Modal>
      </CardHeader>
      <CardBody p={4}>
        <Text>{event.content}</Text>
        <Text fontWeight="bold">{unixTimeToRelative(event.created_at)}</Text>
      </CardBody>
      <CardFooter p={4}>
        <HStack>
          <Button variant="solid" colorScheme="blue" onClick={() => newReply()}>
            Reply
          </Button>
          <Button
            aria-label="Upvote"
            leftIcon={<Icon as={ThumbUpIcon} />}
            onClick={() => newReaction("+")}
          >
            {upVotesCount}
          </Button>
          <Button
            aria-label="Downvote"
            leftIcon={<Icon as={ThumbDownIcon} />}
            onClick={() => newReaction("-")}
          >
            {downVotesCount}
          </Button>
          <Button aria-label="Repost" leftIcon={<Icon as={RepeatIcon} />}>
            {repostsCount}
          </Button>
          {reactionsWithCount &&
            Object.keys(reactionsWithCount).map((r) => (
              <Button key={r} aria-label="Repost" isDisabled={true}>
                {r} {reactionsWithCount[r]}
              </Button>
            ))}
        </HStack>
      </CardFooter>
    </Card>
  );
}
