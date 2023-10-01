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
  NOSTR_URL_PREFIX,
  bechEncodeEventId,
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
import { ZapModal } from "./event/zap-modal";

export interface EventProps {
  data: LightProcessedEvent;
  level: number;
}

export function Event({ data, level }: EventProps) {
  const [isReady] = useNClient((state) => [
    (state.status === "offline" || state.status === "online") &&
      state.keystore !== "none",
  ]);

  const [user, setUser] = useState<UserBase>(
    data.user
      ? data.user
      : {
          pubkey: data.event.pubkey,
        }
  );

  const content = extractEventContent(data.event.content);
  const contentWarning = eventHasContentWarning(data.event);

  const nevent = bechEncodeEventId(data.event.id);

  let visible;
  if (content?.text && !contentWarning) {
    visible = true;
  } else if (contentWarning) {
    visible = false;
  }

  const properties: {
    isLoaded: boolean;
    contentWarning: string | undefined;
    images: string[] | undefined;
    videos: string[] | undefined;
    nurls:
      | {
          type: NOSTR_URL_PREFIX;
          data: string;
        }[]
      | undefined;
    text: string | undefined;
  } = {
    isLoaded: true,
    contentWarning,
    images: content.images,
    videos: content.videos,
    nurls: content.nurls,
    text: content.text,
  };

  const [contentIsVisible, makeContentVisible] = useState(visible);

  const userOptions = {
    showFollowing: true,
    showBlock: true,
    showLud: true,
    relayUrls: data.eventRelayUrls,
  };

  const {
    isOpen: isInfoModalOpen,
    onOpen: onInfoModalOpen,
    onClose: onInfoModalClose,
  } = useDisclosure();

  const {
    isOpen: isRepliesOpen,
    onOpen: onRepliesOpen,
    onClose: onRepliesClose,
  } = useDisclosure();

  const {
    isOpen: zapModalIsOpen,
    onOpen: onZapModalOpen,
    onClose: onZapModalClose,
  } = useDisclosure();

  const toast = useToast();

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

  const relatedRelay = async () => {
    if (!data.eventRelayUrls) return;
    const relays = (await useNClient.getState().getRelays()) || [];
    const relay = relays.find((r) => data.eventRelayUrls.includes(r.url));
    if (relay && relay.write) return relay;
  };

  const replyCallback = async (eventId: string) => {
    console.log("replyCallback", eventId);
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
  const newAction = async (
    type: "quote" | "reaction" | "zap",
    reaction?: string
  ) => {
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
      case "zap":
        onZapModalOpen();
        return;
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
    <>
      <Card>
        {/* HEADER */}
        <CardHeader p={0}>
          {contentIsVisible ? (
            <EventBanner
              images={properties.images}
              videos={properties.videos}
            />
          ) : (
            <NSFWContentToggle
              contentWarning={properties.contentWarning}
              setShowNSFWContent={makeContentVisible}
            />
          )}
          <Box p={1} pl={2}>
            <User user={user} opts={userOptions} />
          </Box>
        </CardHeader>
        {/* BODY */}

        {contentIsVisible && (
          <CardBody p={0}>
            <Skeleton isLoaded={properties.isLoaded}>
              <EventContent
                content={
                  properties.isLoaded ? properties.text : data.event.content
                }
              />
            </Skeleton>
          </CardBody>
        )}
        {/* FOOTER */}
        <EventCardFooter
          isReady={isReady}
          level={level}
          nEventString={nevent}
          createdAt={data.event.created_at}
          repliesCount={data.repliesCount}
          reactionsCount={data.reactionsCount}
          repostCount={data.repostsCount}
          zapReceiptCount={data.zapReceiptCount}
          zapReceiptAmount={data.zapReceiptAmount}
          isReplyOpen={isRepliesOpen}
          onReplyOpen={onRepliesOpen}
          onReplyClose={onRepliesClose}
          isInfoModalOpen={isInfoModalOpen}
          onInfoModalOpen={onInfoModalOpen}
          onInfoModalClose={onInfoModalClose}
          onAction={newAction}
        />
      </Card>

      {isRepliesOpen && (
        <EventReplies
          data={data}
          isOpen={isRepliesOpen}
          sendCallback={replyCallback}
          level={level}
        />
      )}
      <EventInfoModal
        data={data}
        nEventString={nevent}
        isOpen={isInfoModalOpen}
        onClose={onInfoModalClose}
      />
      <ZapModal
        user={user}
        relatedEvent={data.event}
        isOpen={zapModalIsOpen}
        onClose={onZapModalClose}
      />
    </>
  );
}
