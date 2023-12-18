import {
  Heading,
  Text,
  Image,
  Box,
  LinkBox,
  LinkOverlay,
  Flex,
  Link,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { excerpt } from "../../lib/excerpt";

const fetchProxyData = async (url: string, proxyUrl?: string) => {
  if (proxyUrl === undefined) {
    throw new Error("Proxy URL is not defined");
  }

  const response = await fetch(`${proxyUrl}${url}`);

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
  proxyUrl?: string;
}

export function LinkPreview({ url, proxyUrl }: LinkPreviewProps) {
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
    if (proxyUrl === undefined) {
      return;
    }
    setIsLoading(true);
    try {
      const result = await fetchProxyData(url, proxyUrl);
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
        <Box p={4} border="1px solid" borderColor="gray.300">
          <LinkBox as={Flex}>
            {data.image && (
              <Box flex="1">
                <Image src={data.image} mb={2} />
              </Box>
            )}
            <Box flex="5" ml={data.image ? 4 : 0}>
              <LinkOverlay href={url}>
                <Heading size="sm">{data.title}</Heading>
              </LinkOverlay>
              {data.description && (
                <Text fontSize="xs">{excerpt(data.description, 160)}</Text>
              )}
              <Text>
                {data.siteName && `${data.siteName}, `}
                {data.hostname}
              </Text>
            </Box>
          </LinkBox>
        </Box>
      ) : (
        <Link target={url}>{url}</Link>
      )}
    </>
  );
}
