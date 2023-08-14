import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Text,
  Button,
  Box,
  IconButton,
  Icon,
  useToast,
  HStack,
} from "@chakra-ui/react";
import {
  NEventWithUserBase,
  NewReaction,
  NewShortTextNoteResponse,
} from "@nostr-ts/common";
import { useNClient } from "../state/client";
import { UserKnown, UserUnknown } from "./user";
import { useEffect, useState } from "react";
import ThumbUpIcon from "mdi-react/ThumbUpIcon";
import ThumbDownIcon from "mdi-react/ThumbDownIcon";
import { unixTimeToRelative } from "../lib/relative-time";

export function Event({ user, event }: NEventWithUserBase) {
  const [following, setFollowing] = useState<boolean>(false);
  const toast = useToast();

  useEffect(() => {
    const update = async () => {
      const following = await useNClient.getState().followingUser(event.pubkey);
      setFollowing(following);
    };
    update();
  }, [event.pubkey]);

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
      useNClient.getState().signAndSendEvent(ev);
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
      <CardHeader p={4}>
        <Box>
          {user ? (
            <UserKnown user={user} />
          ) : (
            <UserUnknown pubkey={event.pubkey} />
          )}
        </Box>
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
          {following ? (
            <Button
              variant="solid"
              colorScheme="red"
              onClick={() => useNClient.getState().unfollowUser(event.pubkey)}
            >
              Unfollow
            </Button>
          ) : (
            <Button
              variant="solid"
              colorScheme="green"
              onClick={() => useNClient.getState().followUser(event.pubkey)}
            >
              Follow
            </Button>
          )}
          <IconButton
            aria-label="Upvote"
            icon={<Icon as={ThumbUpIcon} />}
            onClick={() => newReaction("+")}
          />
          <IconButton
            aria-label="Downvote"
            icon={<Icon as={ThumbDownIcon} />}
            onClick={() => newReaction("-")}
          />
        </HStack>
      </CardFooter>
    </Card>
  );
}
