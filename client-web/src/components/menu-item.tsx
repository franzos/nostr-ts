import { LinkBox, HStack, Text } from "@chakra-ui/react";
import { NavLink } from "react-router-dom";

export function MenuItem({
  label,
  value,
  to,
}: {
  label: string;
  value?: string | number;
  to: string;
}) {
  return (
    <LinkBox
      as={NavLink}
      to={to}
      w="100%"
      padding={2}
      border="1px solid"
      borderColor={"gray.200"}
      borderRadius={2}
      backgroundColor={"gray.100"}
      _hover={{
        backgroundColor: "gray.300",
      }}
      _activeLink={{
        backgroundColor: "gray.300",
      }}
    >
      <HStack>
        <Text fontSize="md" fontWeight="bold">
          {label}
        </Text>
        {value && <Text fontSize="md">{value}</Text>}
      </HStack>
    </LinkBox>
  );
}
