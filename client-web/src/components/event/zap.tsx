import {
  EventBaseSigned,
  LnurlInvoiceResponse,
  NEvent,
  NewZapRequest,
  UserBase,
  encodeLnurl,
  iNewZAPRequest,
  makeLnurlZapRequestUrl,
} from "@nostr-ts/common";
import { NUser } from "@nostr-ts/web";
import { useEffect, useState } from "react";
import { useNClient } from "../../state/client";
import {
  Box,
  Button,
  FormLabel,
  Input,
  InputGroup,
  InputLeftAddon,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { QRCodeSVG } from "qrcode.react";

interface ZapProps {
  user: UserBase;
  relayUrl?: string;
  relatedEvent?: EventBaseSigned;
  onConfirmPayment: () => void;
}

export const Zap = ({
  user,
  relatedEvent,
  onConfirmPayment,
  relayUrl,
}: ZapProps) => {
  const [nUser, setNUser] = useState<NUser | undefined>(undefined);
  const [hasLud, setHasLud] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [amount, setAmount] = useState<number>(0);
  const [bolt11, setBolt11] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  const toast = useToast();

  const [zapRequestResult, setZapRequestResult] = useState<
    | {
        // bech32-serialized lightning invoice
        pr: string;
        event: NEvent;
      }
    | undefined
  >(undefined);

  const requestZap = async () => {
    if (!nUser) return;
    if (amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        status: "error",
        duration: 9000,
        isClosable: true,
      });
      return;
    }
    setIsLoading(true);
    const tempUser = nUser;
    if (!tempUser) return;
    const lud = tempUser?.getLud16Or06Url();
    if (!lud) return;

    if (!tempUser?.hasZapInfo()) {
      try {
        await tempUser?.getZapCallbackInfo(lud.url);
      } catch (e) {
        console.error(e);
        const error = e as Error;
        toast({
          title: "Error",
          description: `Could not get zap callback info: ${error.message}`,
          status: "error",
          duration: 9000,
          isClosable: true,
        });

        setIsLoading(false);
        return;
      }
    }

    const lnurl =
      lud.type === "lud16"
        ? encodeLnurl(tempUser.getLud16() as string)
        : (tempUser.getLud06() as string);

    const reqNotSigned: iNewZAPRequest = {
      amount,
      relayUrls: relayUrl ? [relayUrl] : [],
      recipientPubkey: tempUser?.pubkey,
      lnurl,
    };

    const nEv = NewZapRequest(reqNotSigned);

    // SIGN REQUEST
    const nEvSigned = await useNClient.getState().signEvent(nEv);

    const invoiceUrl = makeLnurlZapRequestUrl({
      callback: tempUser?.lightningZapInfo?.callback,
      amount: reqNotSigned.amount,
      event: nEvSigned.toURI(),
      lnurl: reqNotSigned.lnurl,
    });

    let inv: LnurlInvoiceResponse | undefined;

    try {
      inv = await tempUser.getLightningInvoice(reqNotSigned, invoiceUrl);
    } catch (e) {
      console.error(e);
      const error = e as Error;
      toast({
        title: "Error",
        description: `Could not get lightning invoice: ${error.message}`,
        status: "error",
        duration: 9000,
        isClosable: true,
      });
      setIsLoading(false);
      return;
    }

    if (inv && inv.pr) {
      setZapRequestResult({
        pr: inv.pr,
        event: nEvSigned,
      });
    }

    setIsLoading(false);
  };

  const confirmPayment = async () => {
    if (!zapRequestResult) return;
    if (bolt11 === "" || description === "") {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        status: "error",
        duration: 9000,
        isClosable: true,
      });
      return;
    }
    setIsLoading(true);
    const ev = zapRequestResult.event;
    const receipt = ev.newZapReceipt({
      bolt11,
      description,
    });

    if (relatedEvent) {
      receipt.addEventTag({
        eventId: relatedEvent.id,
      });
    }

    await useNClient.getState().signAndSendEvent({
      event: receipt,
    });

    setIsLoading(false);
    toast({
      title: "Success",
      description: "Payment confirmed. Keep stracking!",
      status: "success",
      duration: 9000,
      isClosable: true,
    });
    onConfirmPayment();
  };

  useEffect(() => {
    const nUser = new NUser(user);
    const hasLud = nUser.getLud16Or06Url() !== undefined;
    setNUser(nUser);
    setHasLud(hasLud);
  }, [user]);

  const NoLud = (
    <>
      {!hasLud && (
        <Text fontWeight="bold">
          The user does not have a supported ligning address.
        </Text>
      )}
    </>
  );

  const RequestInvoice = (
    <>
      {hasLud && !zapRequestResult && (
        <VStack>
          <Text mb={2}>
            Request a ligning invoice, pay it with your ligtning wallet, and
            enter the bolt11 invoice receipt from your wallet in the next step.
          </Text>
          <InputGroup>
            <InputLeftAddon children="Sats" />
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value))}
            />
          </InputGroup>
          <Button onClick={requestZap} isLoading={isLoading} width="100%">
            Get &#8383; LN invoice
          </Button>
        </VStack>
      )}
    </>
  );

  const PayInvoice = (
    <>
      {zapRequestResult && (
        <>
          <Text mb={2} textAlign="center">
            Scan or copy the invoice to your lightning wallet.
          </Text>
          <Box mb={2} width="100%">
            <QRCodeSVG value={zapRequestResult.pr} width="100%" />
          </Box>
          <Input
            type="text"
            value={zapRequestResult.pr}
            onChange={() => setBolt11(zapRequestResult.pr)}
            mb={2}
          />

          <FormLabel htmlFor="bolt11" mt={2}>
            Bolt11
          </FormLabel>
          <Text mb={2}>
            Copy the bolt11 invoice receipt from your lightning wallet.
          </Text>
          <Input
            type="text"
            value={bolt11}
            onChange={(e) => setBolt11(e.target.value)}
            placeholder="lnbc..."
          />
          <FormLabel htmlFor="description" mt={2}>
            Description
          </FormLabel>
          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Keep stracking ..."
            mb={2}
          />

          <Button onClick={confirmPayment} isLoading={isLoading}>
            Confirm payment
          </Button>
        </>
      )}
    </>
  );

  return (
    <Box>
      {NoLud}
      {RequestInvoice}
      {PayInvoice}
    </Box>
  );
};
