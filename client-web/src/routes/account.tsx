import {
  Heading,
  Button,
  Box,
  Text,
  FormControl,
  FormLabel,
  Input,
  HStack,
} from "@chakra-ui/react";
import { generateClientKeys } from "@nostr-ts/common";
import { useNClient } from "../state/client";
import { useState } from "react";

export function AccountRoute() {
  const [keystore] = useNClient((state) => [state.keystore]);
  const [keypairIsLoaded] = useNClient((state) => [state.keypairIsLoaded]);
  const [keypair] = useNClient((state) => [state.keypair]);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const generateKeypair = () => {
    const keypair = generateClientKeys();
    console.log(keypair);
    useNClient.getState().setKeyStore({
      keystore: "localstore",
      publicKey: keypair.publicKey,
      privateKey: keypair.privateKey,
    });
  };

  return (
    <Box>
      <Heading size="lg">Account</Heading>
      {keypairIsLoaded ? (
        <Text>Keypair loaded from {keystore}.</Text>
      ) : (
        <>
          <Text marginBottom={2}>
            Keypair is not loaded. If you generate a new keypair, it will be
            stored in the browser localstore (insecure). Alternate options
            including nos2x support are planned.
          </Text>
          <Button onClick={generateKeypair}>Generate new keypair</Button>
        </>
      )}
      {keypair && (
        <Box mt={4}>
          <FormControl marginBottom={4}>
            <FormLabel>Public key:</FormLabel>
            <Input type="text" value={keypair.publicKey} isReadOnly />
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
