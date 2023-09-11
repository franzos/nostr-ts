import { useEffect, useState } from "react";
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
  const [keystore, keypairIsLoaded, keypair, publicKey, privateKey] =
    useNClient((state) => [
      state.keystore,
      state.keypairIsLoaded,
      state.keypair,
      state?.keypair?.publicKey || "",
      state?.keypair?.privateKey || "",
    ]);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const [keyInputIsActive, setKeyInputIsActive] = useState(false);
  const [newPublicKey, setNewPublicKey] = useState("");
  const [newPrivateKey, setNewPrivateKey] = useState("");

  useEffect(() => {
    setNewPublicKey(publicKey);
  }, [publicKey]);

  useEffect(() => {
    setNewPrivateKey(privateKey);
  }, [privateKey]);

  useEffect(() => {
    if (keystore === "nos2x") {
      setKeyInputIsActive(false);
    }
  }, [keystore]);

  const showPrivateKeyInput =
    (keyInputIsActive || keystore === "localstore") && keystore !== "nos2x";

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

  const saveKeyPair = () => {
    if (newPublicKey.length !== 64) {
      toast({
        title: "Invalid public key",
        description: `Public key must be 64 characters long.`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    if (newPrivateKey !== "" && newPrivateKey.length !== 64) {
      toast({
        title: "Invalid private key",
        description: `Private key must be 64 characters long.`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    if (newPublicKey && newPrivateKey) {
      useNClient.getState().setKeyStore({
        keystore: "localstore",
        publicKey: newPublicKey,
        privateKey: newPrivateKey,
      });
      setKeyInputIsActive(false);
    }
  };

  const reset = () => {
    useNClient.getState().resetKeyStore();
    setNewPrivateKey("");
    setNewPublicKey("");
    setKeyInputIsActive(false);
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
        </>
      )}

      <HStack marginTop={4}>
        {!keystore ||
          (keystore === "none" ? (
            <>
              <Button onClick={generateKeypair}>New keypair</Button>
              <Button onClick={() => setKeyInputIsActive(true)}>
                Enter keypair
              </Button>
              <Button
                isLoading={loadingPublicKeyNosx2}
                onClick={() => publicKeyFromExtention()}
              >
                Load from nos2x
              </Button>
            </>
          ) : (
            <Button onClick={reset}>Reset</Button>
          ))}
      </HStack>
      {keypair && (
        <Box mt={4}>
          <FormControl marginBottom={4}>
            <FormLabel>Public key:</FormLabel>
            <Input
              type="text"
              value={newPublicKey}
              onChange={(e) => setNewPublicKey(e.target.value)}
              isReadOnly
            />
          </FormControl>

          {showPrivateKeyInput && (
            <FormControl marginBottom={4}>
              <FormLabel>Private key:</FormLabel>
              <HStack spacing={2}>
                <Input
                  type={showPrivateKey ? "text" : "password"}
                  value={newPrivateKey}
                  onChange={(e) => setNewPrivateKey(e.target.value)}
                  isReadOnly={!keyInputIsActive}
                />
                <Button
                  size="sm"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                >
                  {showPrivateKey ? "Hide" : "Show"}
                </Button>
              </HStack>
            </FormControl>
          )}

          {keyInputIsActive && <Button onClick={saveKeyPair}>Save</Button>}
        </Box>
      )}
    </Box>
  );
}
