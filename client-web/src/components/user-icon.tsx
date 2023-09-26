import {
  Avatar,
  Box,
  Text,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@chakra-ui/react";
import { UserBase } from "@nostr-ts/common";
import { UserOptions } from "../lib/user-properties";
import { User } from "./user";

export function UserIcon({
  user,
  opts: {
    showAbout,
    showBanner,
    showFollowing,
    relayUrls,
    title,
    reaction,
    avatarSize,
  },
}: {
  user: UserBase;
  opts: UserOptions;
}) {
  const picture = user.data && user.data.picture ? user.data.picture : "";

  return (
    <>
      <Popover>
        <PopoverTrigger>
          {reaction ? (
            <Box position="relative">
              <Avatar size={avatarSize} src={picture} />
              <Box
                position="absolute"
                top="0"
                left="0"
                right="0"
                bottom="0"
                backgroundColor="rgba(255, 255, 255, 0.5)"
                borderRadius={10}
              />
              <Text
                position="absolute"
                right="0"
                bottom="0"
                backgroundColor="white"
                height={15}
                width={15}
                textAlign="center"
                borderRadius={10}
                fontSize={12}
              >
                {reaction}
              </Text>
            </Box>
          ) : (
            <Avatar size={avatarSize} src={picture} />
          )}
        </PopoverTrigger>
        <PopoverContent>
          <PopoverArrow />
          <PopoverCloseButton />
          <PopoverHeader>{title}</PopoverHeader>
          <PopoverBody>
            <User
              user={user}
              opts={{
                showAbout,
                showBanner,
                showFollowing,
                relayUrls,
                title,
                reaction,
                avatarSize,
              }}
            />
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </>
  );
}
