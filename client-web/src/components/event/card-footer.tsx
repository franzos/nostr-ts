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
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  useToast,
} from "@chakra-ui/react";
import { ReactionsCount } from "@nostr-ts/common";
import InformationOutlineIcon from "mdi-react/InformationOutlineIcon";
import { filterReactions } from "../../lib/event-reactions-filter";
import { unixTimeToRelative } from "../../lib/relative-time";
import { EventActionButtons } from "./action-buttons";
import CodeJsonIcon from "mdi-react/CodeJsonIcon";
import ContentCopyIcon from "mdi-react/ContentCopyIcon";
import { excerpt } from "../../lib/excerpt";

export interface CardFooterProps {
  isReady: boolean;

  level: number;
  nEventString: string;
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

  onAction: (type: "quote" | "reaction" | "zap", reaction?: string) => void;
}

export const EventCardFooter = ({
  isReady,

  level,
  nEventString,
  createdAt,
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
  const toast = useToast();
  const reactions = filterReactions(reactionsCount);

  const copyEventLinkToClipboard = () => {
    const url = `${window.location.origin}/#/e/${nEventString}`;
    navigator.clipboard.writeText(url);
    toast({
      description: `Copied ${excerpt(url, 40)} to clipboard`,
      status: "success",
      duration: 5000,
      isClosable: true,
    });
  };

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
            <Menu>
              <MenuButton
                as={IconButton}
                size="xs"
                variant="outline"
                color="gray.500"
                icon={<Icon as={InformationOutlineIcon} />}
              />
              <MenuList>
                <MenuItem
                  icon={<Icon as={ContentCopyIcon} />}
                  onClick={copyEventLinkToClipboard}
                >
                  Copy direct event link
                </MenuItem>
                <MenuItem
                  icon={<Icon as={CodeJsonIcon} />}
                  onClick={() =>
                    isInfoModalOpen ? onInfoModalClose() : onInfoModalOpen()
                  }
                >
                  Event JSON
                </MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </Box>
      </VStack>
    </CardFooter>
  );
};
