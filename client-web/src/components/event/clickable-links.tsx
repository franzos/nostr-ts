import { Link } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { useMemo } from "react";
import { OnDemandEvent } from "../on-demand-event";
import { OnDemandUsername } from "../on-demand-username";
import { LinkPreview } from "./link-preview";
import { CONTENT_REGEX_PATTERNS, CONTENT_SPLIT_PATTERN } from "../../lib/regex-patterns";

interface EventContentWithLinksProps {
  text: string;
  linkPreviewProxyUrl?: string;
}

export function EventContentWithLinks({
  text,
  linkPreviewProxyUrl,
}: EventContentWithLinksProps) {
  // Cache the token splitting operation - only recompute when text changes
  const tokens = useMemo(() => {
    if (!text) return [];
    return text.split(CONTENT_SPLIT_PATTERN);
  }, [text]);

  if (!text) return null;

  return (
    <>
      {tokens.map((token, index) => {
        if (CONTENT_REGEX_PATTERNS.url.test(token)) {
          // Reset regex lastIndex to avoid issues with global flag
          CONTENT_REGEX_PATTERNS.url.lastIndex = 0;
          return (
            <LinkPreview
              url={token}
              proxyUrl={linkPreviewProxyUrl}
              key={index}
            />
          );
        }
        if (CONTENT_REGEX_PATTERNS.note.test(token)) {
          CONTENT_REGEX_PATTERNS.note.lastIndex = 0;
          const noteId = token.split(":").pop();
          return (
            noteId && <OnDemandEvent key={index} note={noteId} index={index} />
          );
        }
        if (CONTENT_REGEX_PATTERNS.profile.test(token)) {
          CONTENT_REGEX_PATTERNS.profile.lastIndex = 0;
          const profileId = token.split(":").pop();
          return <OnDemandUsername npub={profileId} key={index} />;
        }
        if (CONTENT_REGEX_PATTERNS.tags.test(token)) {
          CONTENT_REGEX_PATTERNS.tags.lastIndex = 0;
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
