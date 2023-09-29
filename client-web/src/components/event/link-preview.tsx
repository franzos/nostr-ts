import {
  Heading,
  Text,
  Image,
  Box,
  LinkBox,
  LinkOverlay,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { excerpt } from "../../lib/excerpt";

const fetchProxyData = async (url: string) => {
  const response = await fetch(`https://p1.nostrop.com?url=${url}`, {
    headers: {
      client: "nostrop",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return {
    title: data.title || null,
    description: data.description || null,
    image: data.image || null,
    siteName: data.siteName || null,
    hostname: data.hostname || null,
  };
};

interface LinkPreviewProps {
  url: string;
}

export function LinkPreview({ url }: LinkPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [data, setData] = useState<{
    title: string | null;
    description: string | null;
    image: string | null;
    siteName: string | null;
    hostname: string | null;
  } | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const result = await fetchProxyData(url);
      setData(result);
    } catch (err) {
      setHasError(true);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <>
      {!isLoading && !hasError && data ? (
        <Box p={4} border="1px solid" color="gray.300">
          <LinkBox>
            {data.image && <Image src={data.image} mb={2} />}
            <LinkOverlay href={url}>
              <Heading size="sm">{data.title}</Heading>
            </LinkOverlay>
            {data.description && (
              <Text size="xs">{excerpt(data.description, 160)}</Text>
            )}
            <Text>
              {data.siteName && `${data.siteName}, `}
              {data.hostname}
            </Text>
          </LinkBox>
        </Box>
      ) : (
        <Text>{url}</Text>
      )}
    </>
  );
}
