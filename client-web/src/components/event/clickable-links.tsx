import { Link } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { OnDemandEvent } from "../on-demand-event";
import { OnDemandUsername } from "../on-demand-username";
import { LinkPreview } from "./link-preview";

interface EventContentWithLinksProps {
  text: string;
  linkPreviewProxyUrl?: string;
}

export function EventContentWithLinks({
  text,
  linkPreviewProxyUrl,
}: EventContentWithLinksProps) {
  if (!text) return null;

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const noteRegex = /(?:nostr:)?(note[0-9a-zA-Z]+|nevent[0-9a-zA-Z]+)/g;
  const profileRegex = /(?:nostr:)?(npub[0-9a-zA-Z]+|nprofile[0-9a-zA-Z]+)/g;
  const tagsRegex = /#[a-zA-Z0-9]+/g;

  const tokens = text.split(
    /(https?:\/\/[^\s]+|(?:nostr:)?note[0-9a-zA-Z]+|(?:nostr:)?npub[0-9a-zA-Z]+|(?:nostr:)?nprofile[0-9a-zA-Z]+|(?:nostr:)?nevent[0-9a-zA-Z]+|#[a-zA-Z0-9]+)/g
  );

  return (
    <>
      {tokens.map((token, index) => {
        if (urlRegex.test(token)) {
          return (
            <LinkPreview
              url={token}
              proxyUrl={linkPreviewProxyUrl}
              key={index}
            />
          );
        }
        if (noteRegex.test(token)) {
          const noteId = token.split(":").pop();
          return (
            noteId && <OnDemandEvent key={index} note={noteId} index={index} />
          );
        }
        if (profileRegex.test(token)) {
          const profileId = token.split(":").pop();
          return <OnDemandUsername npub={profileId} key={index} />;
        }
        if (tagsRegex.test(token)) {
          return (
            <Link
              as={RouterLink}
              key={index}
              to={`/t/${encodeURIComponent(token.slice(1))}`}
              color={"gray.500"}
            >
              {token}
            </Link>
          );
        }
        return token;
      })}
    </>
  );
}
