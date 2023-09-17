import ReactPlayer from "react-player";
import { Button, Box, Image, Text, AspectRatio } from "@chakra-ui/react";
import { Slideshow } from "./image-slideshow";

const Images = (images: string[]) => {
  return (
    <>
      {images?.length === 1 ? (
        <Image
          width={"100%"}
          src={images[0]}
          fallback={
            <Box width="100%" textAlign="center">
              <Text>Image failed to load.</Text>
            </Box>
          }
          fallbackStrategy="onError"
          alt=""
        />
      ) : (
        <Slideshow images={images} />
      )}
    </>
  );
};

const Content = (
  images: string[] | undefined,
  videos: string[] | undefined
) => {
  return (
    <Box width="100%">
      {images && Images(images)}
      {videos &&
        videos.map((url, index) => (
          <AspectRatio ratio={16 / 9}>
            <ReactPlayer
              key={index}
              url={url}
              controls={true}
              width="100%"
              height="100%"
            />
          </AspectRatio>
        ))}
    </Box>
  );
};

const ContentWarningToggle = (
  hasContent: boolean,
  contentWarning: string | undefined,
  setShowContent: (show: boolean) => void
) => {
  return (
    <>
      {hasContent && contentWarning !== null ? (
        <Button
          size="sm"
          width="100%"
          overflowWrap="break-word"
          wordBreak="break-all"
          onClick={() => setShowContent(true)}
        >
          Show Content{" "}
          {contentWarning !== "" ? `(${contentWarning})` : `(NSFW)`}
        </Button>
      ) : (
        <Text>No content found.</Text>
      )}
    </>
  );
};

interface EventBannerProps {
  extractedContent:
    | {
        images: string[] | undefined;
        videos: string[] | undefined;
        text: string;
      }
    | undefined;
  showContent: boolean;
  hasContentWarning: string | undefined;
  setShowContent: (show: boolean) => void;
}

export function EventBanner({
  extractedContent,
  showContent,
  hasContentWarning,
  setShowContent,
}: EventBannerProps) {
  return (
    <>
      {!showContent &&
        ContentWarningToggle(
          extractedContent !== null,
          hasContentWarning,
          setShowContent
        )}
      {showContent &&
        Content(extractedContent?.images, extractedContent?.videos)}
    </>
  );
}
