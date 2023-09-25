import { Button } from "@chakra-ui/react";

interface NSFWContentToggleProps {
  contentWarning: string | undefined;
  setShowNSFWContent: (show: boolean) => void;
}

export const NSFWContentToggle = ({
  contentWarning,
  setShowNSFWContent,
}: NSFWContentToggleProps) => {
  return (
    <Button
      size="sm"
      width="100%"
      overflowWrap="break-word"
      wordBreak="break-all"
      onClick={() => setShowNSFWContent(true)}
    >
      Show content{" "}
      {contentWarning && contentWarning !== ""
        ? `(${contentWarning})`
        : `(NSFW)`}
    </Button>
  );
};
