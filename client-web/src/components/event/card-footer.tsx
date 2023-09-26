import {
  CardFooter,
  Button,
  HStack,
  Spacer,
  IconButton,
  Icon,
  Box,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ReactionsCount } from "@nostr-ts/common";
import InformationOutlineIcon from "mdi-react/InformationOutlineIcon";
import { filterReactions } from "../../lib/event-reactions-filter";
import { unixTimeToRelative } from "../../lib/relative-time";
import { EventActionButtons } from "./action-buttons";

export interface CardFooterProps {
  isReady: boolean;

  level: number;
  createdAt: number;
  repliesCount: number;
  reactionsCount: ReactionsCount;
  repostCount: number;
  zapReceiptCount: number;
  zapReceiptAmount: number;

  isReplyOpen: boolean;
  onReplyOpen: () => void;
  onReplyClose: () => void;

  isInfoModalOpen: boolean;
  onInfoModalOpen: () => void;
  onInfoModalClose: () => void;

  onAction: (type: "quote" | "reaction", reaction?: string) => void;
}

export const EventCardFooter = ({
  isReady,

  createdAt,
  level,
  repliesCount,
  reactionsCount,
  repostCount,
  zapReceiptCount,
  zapReceiptAmount,

  isReplyOpen,
  onReplyOpen,
  onReplyClose,

  isInfoModalOpen,
  onInfoModalOpen,
  onInfoModalClose,

  onAction,
}: CardFooterProps) => {
  const reactions = filterReactions(reactionsCount);

  return (
    <CardFooter p={1} pl={2} pr={2}>
      <VStack align="stretch">
        <Box overflowWrap={"break-word"} wordBreak={"break-word"}>
          {reactions &&
            Object.keys(reactions).map((r) => (
              <Button
                size="xs"
                variant="outline"
                key={r}
                aria-label="Repost"
                isDisabled={true}
                m={0.5}
              >
                {r} {reactions[r]}
              </Button>
            ))}
        </Box>
        <Box>
          <HStack>
            <EventActionButtons
              isReady={isReady}
              level={level}
              repliesCount={repliesCount}
              reactionsCount={reactionsCount}
              repostCount={repostCount}
              zapReceiptCount={zapReceiptCount}
              zapReceiptAmount={zapReceiptAmount}
              isReplyOpen={isReplyOpen}
              onReplyOpen={onReplyOpen}
              onReplyClose={onReplyClose}
              onAction={onAction}
            />

            <Spacer />
            <Text fontSize={12} color="gray.500">
              {unixTimeToRelative(createdAt)}
            </Text>
            <IconButton
              aria-label="Event info"
              size={"xs"}
              variant="outline"
              color="gray.500"
              icon={<Icon as={InformationOutlineIcon} />}
              onClick={() =>
                isInfoModalOpen ? onInfoModalClose() : onInfoModalOpen()
              }
            ></IconButton>
          </HStack>
        </Box>
      </VStack>
    </CardFooter>
  );
};
