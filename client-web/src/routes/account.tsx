import { useState } from "react";
import {
  Heading,
  Button,
  Box,
  Text,
  FormControl,
  FormLabel,
  Input,
  HStack,
  useToast,
} from "@chakra-ui/react";
import { generateClientKeys } from "@nostr-ts/common";
import { useNClient } from "../state/client";

export function AccountRoute() {
  const [keystore] = useNClient((state) => [state.keystore]);
  const [keypairIsLoaded] = useNClient((state) => [state.keypairIsLoaded]);
  const [keypair] = useNClient((state) => [state.keypair]);
  const [publicKey] = useNClient((state) => [state?.keypair?.publicKey || ""]);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const toast = useToast();
  const [loadingPublicKeyNosx2, setLoadingPublicKeyNosx2] = useState(false);

  const generateKeypair = () => {
    const keypair = generateClientKeys();
    useNClient.getState().setKeyStore({
      keystore: "localstore",
      publicKey: keypair.publicKey,
      privateKey: keypair.privateKey,
    });
  };

  const publicKeyFromExtention = async (retryCount?: number) => {
    setLoadingPublicKeyNosx2(true);
    if (window.nostr) {
      try {
        // Public key as hex string
        const publicKey = await window.nostr.getPublicKey();
        console.log(publicKey);
        useNClient.getState().setKeyStore({
          keystore: "nos2x",
          publicKey: publicKey,
          privateKey: "",
        });
        setLoadingPublicKeyNosx2(false);
      } catch (error) {
        console.error("Error loading public key:", error);
        setLoadingPublicKeyNosx2(false);
      }
    } else {
      console.log(`Nostr extention not ready, retry ${retryCount}`);
      const count = retryCount ? retryCount + 1 : 1;
      if (count > 2) {
        toast({
          title: "Error loading relays",
          description: `nos2x extention not available or ready.`,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setLoadingPublicKeyNosx2(false);
        return;
      }
      setTimeout(() => publicKeyFromExtention(count), 1000); // retry after 1 second
    }
  };

  return (
    <Box>
      <Heading size="lg">Account</Heading>
      {keypairIsLoaded ? (
        <Text fontWeight="bold">Keypair loaded from {keystore}.</Text>
      ) : (
        <>
          <Text fontWeight="bold" marginBottom={2}>
            Keypair is not loaded.
          </Text>
          <Text marginBottom={2}>
            If you generate a new keypair, it will be stored in the browser
            local store (insecure). Alternatively get nos2x for Chrome, or
            nos2x-fox for Firefox, and store your keys in the extention (less
            insecure).
          </Text>
          <HStack>
            <Button onClick={generateKeypair}>Generate new keypair</Button>
            <Button
              isLoading={loadingPublicKeyNosx2}
              onClick={() => publicKeyFromExtention()}
            >
              Load from nos2x
            </Button>
          </HStack>
        </>
      )}
      {keypair && (
        <Box mt={4}>
          <FormControl marginBottom={4}>
            <FormLabel>Public key:</FormLabel>
            <Input type="text" value={publicKey} isReadOnly />
          </FormControl>

          <FormControl marginBottom={4}>
            <FormLabel>Private key:</FormLabel>
            <HStack spacing={2}>
              <Input
                type={showPrivateKey ? "text" : "password"}
                value={keypair.privateKey}
                isReadOnly
              />
              <Button
                isDisabled={keystore !== "localstore"}
                size="sm"
                onClick={() => setShowPrivateKey(!showPrivateKey)}
              >
                {showPrivateKey ? "Hide" : "Show"}
              </Button>
            </HStack>
          </FormControl>
        </Box>
      )}
    </Box>
  );
}
