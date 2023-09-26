import { Box } from "@chakra-ui/react";
import { EventContentWithLinks } from "./clickable-links";

interface EventContentProps {
  content: string | undefined;
}

export function EventContent({ content }: EventContentProps) {
  return (
    <>
      {content && content !== "" && (
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
          <EventContentWithLinks text={content} />
        </Box>
      )}
    </>
  );
}
