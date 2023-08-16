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

export function Event({ user, event, reactions, reposts }: NEventWithUserBase) {
  const toast = useToast();

  const downVotesCount =
    reactions?.filter((r) => r.content === "-").length || 0;
  const upVotesCount = reactions?.filter((r) => r.content === "+").length || 0;
  const repostsCount = reposts?.length || 0;

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
      <CardHeader p={4}>
        <Box>
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
          {reactions &&
            reactions.map((r) => (
              <Text key={r.id} fontWeight="bold">
                {r.content}
              </Text>
            ))}
        </HStack>
      </CardFooter>
    </Card>
  );
}
