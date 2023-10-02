import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionIcon,
  AccordionPanel,
  Box,
  Text,
} from "@chakra-ui/react";
import { SatteliteCDN } from "./sattelite-cdn";

export function AccountsList() {
  return (
    <Accordion>
      <AccordionItem>
        <h2>
          <AccordionButton>
            <Box as="span" flex="1" textAlign="left">
              Sattelite CDN
              <Text>Pay as you go data storage</Text>
            </Box>
            <AccordionIcon />
          </AccordionButton>
        </h2>
        <AccordionPanel pb={4}>
          <SatteliteCDN />
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
}
