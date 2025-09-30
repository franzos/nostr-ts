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

enum TokenType {
  URL = 0,
  NOTE = 1,
  PROFILE = 2,
  TAG = 3,
  TEXT = 4,
}

interface ProcessedToken {
  type: TokenType;
  value: string;
  extra?: string; // For extracted IDs
}

export function EventContentWithLinks({
  text,
  linkPreviewProxyUrl,
}: EventContentWithLinksProps) {
  // Cache token splitting and type detection - only recompute when text changes
  const processedTokens = useMemo<ProcessedToken[]>(() => {
    if (!text) return [];

    const rawTokens = text.split(CONTENT_SPLIT_PATTERN);
    return rawTokens.map((token): ProcessedToken => {
      // Check patterns once and cache the result
      if (CONTENT_REGEX_PATTERNS.url.test(token)) {
        CONTENT_REGEX_PATTERNS.url.lastIndex = 0;
        return { type: TokenType.URL, value: token };
      }
      if (CONTENT_REGEX_PATTERNS.note.test(token)) {
        CONTENT_REGEX_PATTERNS.note.lastIndex = 0;
        return { type: TokenType.NOTE, value: token, extra: token.split(":").pop() };
      }
      if (CONTENT_REGEX_PATTERNS.profile.test(token)) {
        CONTENT_REGEX_PATTERNS.profile.lastIndex = 0;
        return { type: TokenType.PROFILE, value: token, extra: token.split(":").pop() };
      }
      if (CONTENT_REGEX_PATTERNS.tags.test(token)) {
        CONTENT_REGEX_PATTERNS.tags.lastIndex = 0;
        return { type: TokenType.TAG, value: token };
      }
      return { type: TokenType.TEXT, value: token };
    });
  }, [text]);

  if (!text) return null;

  return (
    <>
      {processedTokens.map((token, index) => {
        switch (token.type) {
          case TokenType.URL:
            return (
              <LinkPreview
                url={token.value}
                proxyUrl={linkPreviewProxyUrl}
                key={index}
              />
            );
          case TokenType.NOTE:
            return token.extra ? (
              <OnDemandEvent key={index} note={token.extra} index={index} />
            ) : null;
          case TokenType.PROFILE:
            return <OnDemandUsername npub={token.extra} key={index} />;
          case TokenType.TAG:
            return (
              <Link
                as={RouterLink}
                key={index}
                to={`/t/${encodeURIComponent(token.value.slice(1))}`}
                color={"gray.500"}
              >
                {token.value}
              </Link>
            );
          default:
            return token.value;
        }
      })}
    </>
  );
}
