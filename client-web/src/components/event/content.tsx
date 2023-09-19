import { Box } from "@chakra-ui/react";
import { EventContentWithLinks } from "./clickable-links";

interface EventContentProps {
  content: string;
}

export function EventContent({ content }: EventContentProps) {
  return (
    <>
      {content !== "" && (
        <Box
          overflowWrap={"break-word"}
          wordBreak={"break-word"}
          pl={4}
          pr={4}
          pt={2}
          pb={2}
          background={"blackAlpha.100"}
          borderRadius={4}
          style={{ overflowWrap: "anywhere" }}
        >
          <EventContentWithLinks text={content} />
        </Box>
      )}
    </>
  );
}
