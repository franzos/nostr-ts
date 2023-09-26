import { HStack, Button, Icon } from "@chakra-ui/react";
import { ReactionsCount } from "@nostr-ts/common";
import CurrencyBtcIcon from "mdi-react/CurrencyBtcIcon";
import RepeatIcon from "mdi-react/RepeatIcon";
import ReplyIcon from "mdi-react/ReplyIcon";
import ThumbDownIcon from "mdi-react/ThumbDownIcon";
import ThumbUpIcon from "mdi-react/ThumbUpIcon";

export interface EventActionButtonsProps {
  isReady: boolean;
  level: number;

  repliesCount: number;
  reactionsCount: ReactionsCount;
  repostCount: number;
  zapReceiptCount: number;
  zapReceiptAmount: number;

  isReplyOpen: boolean;
  onReplyOpen: () => void;
  onReplyClose: () => void;
  onAction: (type: "quote" | "reaction", reaction?: string) => void;
}

export function EventActionButtons({
  isReady,
  level,
  repliesCount,
  reactionsCount,
  repostCount,
  zapReceiptCount,
  zapReceiptAmount,
  isReplyOpen,
  onReplyOpen,
  onReplyClose,
  onAction,
}: EventActionButtonsProps) {
  return (
    <HStack>
      <Button
        size="xs"
        variant="outline"
        color="gray.500"
        colorScheme="blue"
        leftIcon={<Icon as={ReplyIcon} />}
        onClick={() => (isReplyOpen ? onReplyClose() : onReplyOpen())}
        isDisabled={!isReady || level >= 1}
      >
        {repliesCount}
      </Button>
      <Button
        size="xs"
        variant="outline"
        color="gray.500"
        aria-label="Upvote"
        leftIcon={<Icon as={ThumbUpIcon} />}
        onClick={() => onAction("reaction", "+")}
        isDisabled={!isReady}
      >
        {reactionsCount?.["+"] || 0}
      </Button>
      <Button
        size="xs"
        variant="outline"
        color="gray.500"
        aria-label="Downvote"
        leftIcon={<Icon as={ThumbDownIcon} />}
        onClick={() => onAction("reaction", "-")}
        isDisabled={!isReady}
      >
        {reactionsCount?.["-"] || 0}
      </Button>
      <Button
        size="xs"
        variant="outline"
        color="gray.500"
        aria-label="Repost"
        leftIcon={<Icon as={RepeatIcon} />}
        onClick={() => onAction("quote")}
        isDisabled={!isReady}
      >
        {repostCount}
      </Button>
      <Button
        size="xs"
        variant="outline"
        color="gray.500"
        aria-label="ZAP"
        leftIcon={<Icon as={CurrencyBtcIcon} />}
        isDisabled={!isReady}
      >
        {zapReceiptCount} ({zapReceiptAmount})
      </Button>
    </HStack>
  );
}
