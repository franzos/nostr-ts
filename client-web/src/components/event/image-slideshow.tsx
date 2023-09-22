import Slider from "react-slick";
import { Image, Box } from "@chakra-ui/react";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

interface SlideshowProps {
  images: string[];
}

export function Slideshow({ images }: SlideshowProps) {
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    adaptiveHeight: true,
  };
  return (
    <Slider {...settings}>
      {images.map((image, index) => (
        <Box key={index}>
          <Image src={image} />
        </Box>
      ))}
    </Slider>
  );
}
