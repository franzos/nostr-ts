import { StorageIntegrationProvider } from "../lib/integrations";
import { Text, Icon, HStack } from "@chakra-ui/react";
import CheckCircleIcon from "mdi-react/CheckCircleIcon";

interface IntegrationProps {
  integration: StorageIntegrationProvider;
}

export function Integration({ integration }: IntegrationProps) {
  return (
    <HStack>
      <Icon as={CheckCircleIcon} />
      <Text>Sattelite CDN: {integration.credit}GB </Text>
    </HStack>
  );
}
