import { EventBase } from "@nostr-ts/common";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Heading,
  Text,
  Button,
  Flex,
  Box,
} from "@chakra-ui/react";

export function Event(props: { event: EventBase }) {
  return (
    <Card>
      <CardHeader>
        <Box>
          <Heading size="sm">{props.event.pubkey}</Heading>
          <Text>...</Text>
        </Box>
      </CardHeader>
      <CardBody>
        <Text>{props.event.content}</Text>
      </CardBody>
      <CardFooter>
        <Button variant="solid" colorScheme="blue">
          Reply
        </Button>
      </CardFooter>
    </Card>
  );
}
