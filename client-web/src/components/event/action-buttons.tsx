import { HStack, Button, Icon } from "@chakra-ui/react";
import { LightProcessedEvent, ReactionsCount } from "@nostr-ts/common";
import CurrencyBtcIcon from "mdi-react/CurrencyBtcIcon";
import RepeatIcon from "mdi-react/RepeatIcon";
import ReplyIcon from "mdi-react/ReplyIcon";
import ThumbDownIcon from "mdi-react/ThumbDownIcon";
import ThumbUpIcon from "mdi-react/ThumbUpIcon";

export interface EventActionButtonsProps {
  data: LightProcessedEvent;
  isReady: boolean;
  isReplyOpen: boolean;
  onReplyOpen: () => void;
  onReplyClose: () => void;
  newAction: (type: "quote" | "reaction", reaction?: string) => void;
  level: number;
  showAll?: boolean;
  filteredReactions?: ReactionsCount;
}

export function EventActionButtons({
  data,
  isReady,
  isReplyOpen,
  onReplyOpen,
  onReplyClose,
  newAction,
  level,
  showAll,
  filteredReactions,
}: EventActionButtonsProps) {
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
}
