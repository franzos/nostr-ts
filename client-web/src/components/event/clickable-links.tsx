import { Link } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { excerpt } from "../../lib/excerpt";

interface EventContentWithLinksProps {
  text: string;
}

export function EventContentWithLinks({ text }: EventContentWithLinksProps) {
  if (!text) return "";

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const noteRegex = /(note[0-9a-zA-Z]+)/g;
  const profileRegex = /(npub[0-9a-zA-Z]+|nprofile[0-9a-zA-Z]+)/g;

  const tokens = text.split(
    /(https?:\/\/[^\s]+|note[0-9a-zA-Z]+|npub[0-9a-zA-Z]+|nprofile[0-9a-zA-Z]+)/g
  );

  return tokens.map((token, index) => {
    if (urlRegex.test(token)) {
      return (
        <Link
          color={"gray.500"}
          key={index}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
        >
          {excerpt(token, 40)}
        </Link>
      );
    }
    if (noteRegex.test(token)) {
      return (
        <Link as={RouterLink} key={index} to={`/e/${token}`} color={"gray.500"}>
          {token}
        </Link>
      );
    }
    if (profileRegex.test(token)) {
      return (
        <Link as={RouterLink} key={index} to={`/p/${token}`} color={"gray.500"}>
          {token}
        </Link>
      );
    }
    return token;
  });
}
