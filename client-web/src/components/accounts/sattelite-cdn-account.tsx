import { List, ListItem, ListIcon, Text } from "@chakra-ui/react";
import { SCDNAccountInfo } from "@nostr-ts/web";
import AccountCreditCardOutlineIcon from "mdi-react/AccountCreditCardOutlineIcon";
import DatabaseIcon from "mdi-react/DatabaseIcon";
import TimerSandCompleteIcon from "mdi-react/TimerSandCompleteIcon";
import { bytesToGB } from "../../lib/bytesToGB";
import { roundToDecimal } from "../../lib/round";

interface SatteliteCDNAccountProps {
  account: SCDNAccountInfo;
}

export function SatteliteCDNAccount({ account }: SatteliteCDNAccountProps) {
  const hasCreditButNoFiles =
    account.creditTotal > 0 && account.usageTotal === 0;

  return (
    <List spacing={2}>
      {account.usageTotal > 0 ? (
        <ListItem>
          <ListIcon as={AccountCreditCardOutlineIcon} color="green.500" />
          Credit: {account.usageTotal.toFixed(10)} GB / {account.creditTotal} GB
        </ListItem>
      ) : (
        <ListItem>
          <ListIcon as={AccountCreditCardOutlineIcon} color="green.500" />
          Credit: {account.creditTotal} GB
        </ListItem>
      )}
      {hasCreditButNoFiles ? (
        <ListItem>
          <Text maxW={300}>You haven't uploaded anything yet.</Text>
        </ListItem>
      ) : (
        <>
          <ListItem>
            <ListIcon as={DatabaseIcon} color="green.500" />
            Usage: {roundToDecimal(bytesToGB(account.storageTotal), 5)} GB
          </ListItem>
          <ListItem>
            <ListIcon as={TimerSandCompleteIcon} color="green.500" />
            Expires: {new Date(
              account.paidThrough * 1000
            ).toLocaleDateString()}{" "}
            ({Math.round(account.timeRemaining)} days left)
          </ListItem>
        </>
      )}
    </List>
  );
}
