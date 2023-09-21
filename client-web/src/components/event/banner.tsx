import ReactPlayer from "react-player";
import { Button, Box, Image, Text, AspectRatio } from "@chakra-ui/react";
import { Slideshow } from "./image-slideshow";
import { useState } from "react";

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

interface VideoProps {
  url: string;
}

const Video = (props: VideoProps) => {
  const [showVideo, setShowVideo] = useState(false);
  const domain = new URL(props.url).hostname;

  return (
    <>
      {showVideo ? (
        <AspectRatio ratio={16 / 9}>
          <ReactPlayer
            url={props.url}
            controls={true}
            width="100%"
            height="100%"
            fallback={
              <Box width="100%" textAlign="center">
                <Text>Video failed to load.</Text>
              </Box>
            }
            fallbackStrategy="onError"
          />
        </AspectRatio>
      ) : (
        <Button
          size="sm"
          width="100%"
          overflowWrap="break-word"
          wordBreak="break-all"
          onClick={() => setShowVideo(true)}
        >
          Load video from {domain}
        </Button>
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
      {videos && videos.map((url, index) => <Video url={url} key={index} />)}
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
