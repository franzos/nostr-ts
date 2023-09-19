import { HStack, Text, Link as ChakraLink } from "@chakra-ui/react";
import { ReactElement } from "react";
import { NavLink as ReactRouterLink } from "react-router-dom";

export function MenuItem({
  label,
  value,
  to,
  leftIcon,
}: {
  label: string;
  value?: string | number;
  to: string;
  leftIcon?: ReactElement;
}) {
  return (
    <ChakraLink
      as={ReactRouterLink}
      to={to}
      w="100%"
      padding={2}
      borderRadius={5}
      bg={"blackAlpha.50"}
      border={"1px solid"}
      borderColor={"whiteAlpha.100"}
      _hover={{
        backgroundColor: "blackAlpha.400",
      }}
      _activeLink={{
        backgroundColor: "blackAlpha.300",
      }}
    >
      <HStack>
        {leftIcon}
        <Text fontSize="md" fontWeight="bold">
          {label}
        </Text>
        {value && <Text fontSize="md">{value}</Text>}
      </HStack>
    </ChakraLink>
  );
}
