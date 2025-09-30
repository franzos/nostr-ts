import { useState } from "react";
import { Box, Link } from "@chakra-ui/react";
import { EventContentWithLinks } from "./clickable-links";
import { useSettings } from "../../state/settings";

interface EventContentProps {
  content: string | undefined;
  linkPreviewProxyUrl?: string;
}

export function EventContent({
  content,
  linkPreviewProxyUrl,
}: EventContentProps) {
  const truncateLimit = useSettings((state) => state.contentTruncateLimit);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!content || content === "") {
    return null;
  }

  const shouldTruncate = truncateLimit > 0 && content.length > truncateLimit;

  // Smart truncation at word boundary
  const getTruncatedText = (text: string, limit: number): string => {
    if (text.length <= limit) return text;

    // Find last space before limit
    const truncated = text.slice(0, limit);
    const lastSpace = truncated.lastIndexOf(' ');

    // If we found a space, truncate there; otherwise use the limit
    const cutPoint = lastSpace > limit * 0.8 ? lastSpace : limit;
    return text.slice(0, cutPoint) + '...';
  };

  const displayText = shouldTruncate && !isExpanded
    ? getTruncatedText(content, truncateLimit)
    : content;

  return (
    <Box
      overflowWrap={"break-word"}
      wordBreak={"break-word"}
      pl={2}
      pr={2}
      pt={1}
      pb={1}
      background={"blackAlpha.100"}
      borderRadius={4}
      style={{ overflowWrap: "anywhere" }}
    >
      <EventContentWithLinks
        text={displayText}
        linkPreviewProxyUrl={linkPreviewProxyUrl}
      />
      {shouldTruncate && (
        <Link
          color="blue.500"
          fontSize="sm"
          fontWeight="semibold"
          cursor="pointer"
          onClick={() => setIsExpanded(!isExpanded)}
          ml={1}
        >
          {isExpanded ? "Show less" : "Show more"}
        </Link>
      )}
    </Box>
  );
}
