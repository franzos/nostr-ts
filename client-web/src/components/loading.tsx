import { Spinner, Box, Text } from "@chakra-ui/react";

interface LoadingProps {
  text?: string;
}

export const Loading = ({ text }: LoadingProps) => {
  const defaultText = text ? text : "Just a sec ... Searching the Matrix.";
  return (
    <Box textAlign="center">
      <Text>{defaultText}</Text>
      <Spinner p={4} mt={2} />
    </Box>
  );
};
