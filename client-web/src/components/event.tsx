import { useEffect, useState } from "react";
import {
  Card,
  CardBody,
  useToast,
  useDisclosure,
  CardHeader,
  Box,
  Skeleton,
} from "@chakra-ui/react";
import {
  NEvent,
  NewQuoteRepost,
  NewReaction,
  eventHasContentWarning,
  LightProcessedEvent,
  UserBase,
  extractEventContent,
} from "@nostr-ts/common";
import { useNClient } from "../state/client";
import { excerpt } from "../lib/excerpt";
import { EventInfoModal } from "./event/info-modal";
import { EventContent } from "./event/content";
import { EventReplies } from "./event/replies";
import { NSFWContentToggle } from "./event/nsfw-toggle";
import { EventCardFooter } from "./event/card-footer";
import { EventBanner } from "./event/banner";
import { User } from "./user";

export interface EventProps {
  data: LightProcessedEvent;
  level: number;
}

export function Event({ data, level }: EventProps) {
  const [isReady] = useNClient((state) => [
    (state.status === "offline" || state.status === "online") &&
      state.keystore !== "none",
  ]);

  const [replies, setReplies] = useState<LightProcessedEvent[]>();
  const [contentIsVisible, makeContentVisible] = useState(true);
  const [user, setUser] = useState<UserBase>({
    pubkey: data.event.pubkey,
  });
  const [properties, setProperties] = useState<{
    isLoaded: boolean;
    contentWarning: string | undefined;
    images: string[] | undefined;
    videos: string[] | undefined;
    text: string | undefined;
  }>({
    isLoaded: false,
    contentWarning: undefined,
    images: undefined,
    videos: undefined,
    text: undefined,
  });

  const userOptions = {
    showFollowing: true,
    showBlock: true,
    relayUrls: data.eventRelayUrls,
  };

  const {
    isOpen: isInfoModalOpen,
    onOpen: onInfoModalOpen,
    onClose: onInfoModalClose,
  } = useDisclosure();
  const {
    isOpen: isReplyOpen,
    onOpen: onReplyOpen,
    onClose: onReplyClose,
  } = useDisclosure();

  const toast = useToast();

  useEffect(() => {
    const content = extractEventContent(data.event.content);
    const contentWarning = eventHasContentWarning(data.event);
    if (content?.text && !contentWarning) {
      makeContentVisible(true);
    } else if (contentWarning) {
      makeContentVisible(false);
    }
    const newProps = {
      isLoaded: true,
      contentWarning,
      images: content?.images,
      videos: content?.videos,
      text: content?.text,
    };
    setProperties(newProps);
  }, [data.event.content]);

  useEffect(() => {
    if (level === 0) {
      const user = data.user
        ? data.user
        : {
            pubkey: data.event.pubkey,
          };
      setUser(user);
    }
  }, [data.user]);

  useEffect(() => {
    if (isReplyOpen) {
      loadReplies();
    }
  }, [isReplyOpen]);

  useEffect(() => {
    const loadUser = async () => {
      const user = await useNClient.getState().getUser(data.event.pubkey);
      if (user) {
        setUser(user.user);
      }
    };
    if (level > 0) {
      loadUser();
    }
  }, [data.event.pubkey]);

  const loadReplies = async () => {
    const evData = await useNClient.getState().getEventReplies(data.event.id);
    if (evData) {
      setReplies(evData);
    }
  };

  const sendCallback = () => {
    onReplyClose();
  };

  const relatedRelay = async () => {
    if (!data.eventRelayUrls) return;
    const relays = (await useNClient.getState().getRelays()) || [];
    const relay = relays.find((r) => data.eventRelayUrls.includes(r.url));
    if (relay && relay.write) return relay;
  };

  /**
   * Handle errors
   */
  const handleError = (e: Error | unknown) => {
    let error = "";
    if (e instanceof Error) {
      error = e.message;
    } else {
      error = "Unknown error";
    }
    toast({
      title: "Error",
      description: error,
      status: "error",
      duration: 5000,
      isClosable: true,
    });
  };

  const handleSuccess = (evId: string) => {
    toast({
      title: "Success",
      description: `Event ${excerpt(evId, 5)} submitted`,
      status: "success",
      duration: 5000,
      isClosable: true,
    });
  };

  /**
   * Quote or react to an event
   */
  const newAction = async (type: "quote" | "reaction", reaction?: string) => {
    const relay = await relatedRelay();

    let ev: NEvent;

    switch (type) {
      case "quote":
        ev = NewQuoteRepost({
          inResponseTo: data.event,
          relayUrl: relay ? relay.url : undefined,
        });
        break;
      case "reaction":
        if (!reaction) throw new Error("Reaction is required");
        ev = NewReaction({
          text: reaction,
          inResponseTo: {
            id: data.event.id,
            pubkey: data.event.pubkey,
          },
          relayUrl: relay ? relay.url : undefined,
        });
        break;
      default:
        return;
    }

    try {
      const evId = await useNClient.getState().signAndSendEvent({
        event: ev,
        relayUrls: relay ? [relay.url] : undefined,
      });
      if (evId) {
        handleSuccess(evId);
        setTimeout(() => {
          useNClient.getState().requestInformation(
            {
              source: "events",
              idsOrKeys: [evId],
            },
            {
              timeoutIn: 10000,
            }
          );
        }, 1000);
      }
    } catch (e) {
      handleError(e);
      return;
    }
  };

  return (
    <Card>
      {/* HEADER */}
      <CardHeader p={0}>
        {contentIsVisible ? (
          <EventBanner images={properties.images} videos={properties.videos} />
        ) : (
          <NSFWContentToggle
            contentWarning={properties.contentWarning}
            setShowNSFWContent={makeContentVisible}
          />
        )}
        <Box p={2}>
          <User user={user} options={userOptions} />
        </Box>
      </CardHeader>
      {/* BODY */}
      <CardBody p={0}>
        {contentIsVisible && (
          <Skeleton isLoaded={properties.isLoaded}>
            <EventContent
              content={
                properties.isLoaded ? properties.text : data.event.content
              }
            />
          </Skeleton>
        )}
      </CardBody>
      {/* FOOTER */}
      <EventCardFooter
        isReady={isReady}
        level={level}
        createdAt={data.event.created_at}
        repliesCount={data.repliesCount}
        reactionsCount={data.reactionsCount}
        repostCount={data.repostsCount}
        zapReceiptCount={data.zapReceiptCount}
        zapReceiptAmount={data.zapReceiptAmount}
        isReplyOpen={isReplyOpen}
        onReplyOpen={onReplyOpen}
        onReplyClose={onReplyClose}
        isInfoModalOpen={isInfoModalOpen}
        onInfoModalOpen={onInfoModalOpen}
        onInfoModalClose={onInfoModalClose}
        onAction={newAction}
      />

      <EventReplies
        data={data}
        replies={replies}
        isReplyOpen={isReplyOpen}
        sendCallback={sendCallback}
        level={level}
      />
      <EventInfoModal
        data={data}
        isOpen={isInfoModalOpen}
        onClose={onInfoModalClose}
      />
    </Card>
  );
}
