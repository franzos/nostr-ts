import { useEffect, useState, memo, useMemo, useCallback } from "react";
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
  linkPreviewProxyUrl?: string;
}

function EventComponent({ data, level, linkPreviewProxyUrl }: EventProps) {
  // Optimize zustand subscription to only subscribe to specific state changes
  const isReady = useNClient(
    (state) => (state.status === "offline" || state.status === "online") && state.keystore !== "none"
  );

  const [user, setUser] = useState<UserBase>(() =>
    data.user
      ? data.user
      : {
          pubkey: data.event.pubkey,
        }
  );

  // Cache expensive operations with useMemo
  const content = useMemo(() => extractEventContent(data.event.content), [data.event.content]);
  const contentWarning = useMemo(() => eventHasContentWarning(data.event), [data.event]);
  const nevent = useMemo(() => bechEncodeEventId(data.event.id), [data.event.id]);

  let visible;
  if (content?.text && !contentWarning) {
    visible = true;
  } else if (contentWarning) {
    visible = false;
  }

  const [contentIsVisible, makeContentVisible] = useState(visible);

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
    if (level === 0 || data.user) {
      return;
    }

    const loadUser = async () => {
      const user = await useNClient.getState().getUser(data.event.pubkey);
      if (user) {
        setUser(user.user);
      }
    };
    loadUser();
  }, [data.event.pubkey, level, data.user]);

  // Cache callback functions to prevent recreation
  const relatedRelay = useCallback(async () => {
    if (!data.eventRelayUrls) return;
    const relays = (await useNClient.getState().getRelays()) || [];
    const relay = relays.find((r) => data.eventRelayUrls.includes(r.url));
    if (relay && relay.write) return relay;
  }, [data.eventRelayUrls]);

  /**
   * Handle errors - cached to prevent recreation
   */
  const handleError = useCallback((e: Error | unknown) => {
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
  }, [toast]);

  const handleSuccess = useCallback((evId: string) => {
    toast({
      title: "Success",
      description: `Event ${excerpt(evId, 5)} submitted`,
      status: "success",
      duration: 5000,
      isClosable: true,
    });
  }, [toast]);

  /**
   * Quote or react to an event - cached to prevent recreation
   */
  const newAction = useCallback(async (
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
  }, [data.event, relatedRelay, onZapModalOpen, handleSuccess, handleError]);

  return (
    <>
      <Card>
        {/* HEADER */}
        <CardHeader p={0}>
          {contentIsVisible ? (
            <EventBanner
              images={content.images}
              videos={content.videos}
            />
          ) : (
            <NSFWContentToggle
              contentWarning={contentWarning}
              setShowNSFWContent={makeContentVisible}
            />
          )}
          <Box p={1} pl={2}>
            <User
              user={user}
              opts={{
                showFollowing: true,
                showBlock: true,
                showLud: true,
                relayUrls: data.eventRelayUrls,
              }}
            />
          </Box>
        </CardHeader>
        {/* BODY */}

        {contentIsVisible && (
          <CardBody p={0}>
            <Skeleton isLoaded={true}>
              <EventContent
                content={content.text}
                linkPreviewProxyUrl={linkPreviewProxyUrl}
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
          sendCallback={async (eventId: string) => {
            console.log("replyCallback", eventId);
          }}
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

// Memoized version to prevent unnecessary re-renders
export const Event = memo(EventComponent, (prevProps, nextProps) => {
  // Only re-render if the event data or essential props have changed
  const sameId = prevProps.data.event.id === nextProps.data.event.id;
  const sameContent = prevProps.data.event.content === nextProps.data.event.content;
  const sameLevel = prevProps.level === nextProps.level;
  const sameProxy = prevProps.linkPreviewProxyUrl === nextProps.linkPreviewProxyUrl;
  const sameCounts =
    prevProps.data.repliesCount === nextProps.data.repliesCount &&
    prevProps.data.reactionsCount === nextProps.data.reactionsCount &&
    prevProps.data.repostsCount === nextProps.data.repostsCount &&
    prevProps.data.zapReceiptCount === nextProps.data.zapReceiptCount;

  return sameId && sameContent && sameLevel && sameProxy && sameCounts;
});
