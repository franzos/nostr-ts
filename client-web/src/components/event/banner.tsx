import ReactPlayer from "react-player";
import { Button, Box, Image, Text, AspectRatio } from "@chakra-ui/react";
import { Slideshow } from "./image-slideshow";
import { useState } from "react";

interface ImageProps {
  src: string;
  alt?: string;
}

const EventImage = ({ src, alt }: ImageProps) => {
  return (
    <Image
      width={"100%"}
      src={src}
      fallback={
        <Box width="100%" textAlign="center">
          <Text>Image failed to load.</Text>
        </Box>
      }
      fallbackStrategy="onError"
      alt={alt}
    />
  );
};

interface ImagesProps {
  images: string[];
}

const Images = ({ images }: ImagesProps) => {
  return (
    <>
      {images?.length === 1 ? (
        <EventImage src={images[0]} />
      ) : (
        <Slideshow images={images} />
      )}
    </>
  );
};

interface VideoProps {
  url: string;
}

const EventVideo = (props: VideoProps) => {
  const [loadVideo, setLoadVideo] = useState(false);
  const domain = new URL(props.url).hostname;
  const canPlay = ReactPlayer.canPlay(props.url);

  return (
    <>
      {loadVideo ? (
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
          onClick={() => setLoadVideo(true)}
          isDisabled={!canPlay}
        >
          {canPlay ? `Load video from ${domain}` : "Cannot play this video."}
        </Button>
      )}
    </>
  );
};

interface VideosProps {
  videos: string[];
}

const Videos = ({ videos }: VideosProps) => {
  return (
    <>
      {videos.map((url, index) => (
        <EventVideo url={url} key={index} />
      ))}
    </>
  );
};

interface EventBannerProps {
  images: string[] | undefined;
  videos: string[] | undefined;
}

export function EventBanner({ images, videos }: EventBannerProps) {
  return (
    <>
      {images && <Images images={images} />}
      {videos && <Videos videos={videos} />}
    </>
  );
}
