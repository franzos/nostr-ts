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
  Icon,
  VStack,
} from "@chakra-ui/react";
import {
  BECH32_PREFIX,
  decodeBech32,
  generateClientKeys,
  isNostrUrl,
  publicKeyFromPrivateKey,
} from "@nostr-ts/common";
import { useNClient } from "../state/client";
import { QrReader } from "react-qr-reader";
import PlusIcon from "mdi-react/PlusIcon";
import QrcodeScanIcon from "mdi-react/QrcodeScanIcon";
import KeyChainVariantIcon from "mdi-react/KeyChainVariantIcon";
import ToyBrickOutlineIcon from "mdi-react/ToyBrickOutlineIcon";
import { QRCodeModal } from "../components/qrcode";

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

  const [loadKeyFromQr, setLoadKeyFromQr] = useState<boolean>(false);

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

  const showPublicKeyInput = keyInputIsActive || publicKey !== "";

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

  const setFromQr = (data: string) => {
    const isNostr = isNostrUrl(data);

    let prefix;
    let decoded;

    if (isNostr) {
      const parts = data.split(":");
      decoded = decodeBech32(parts[1]);
      prefix = decoded.prefix;
      if (!decoded) {
        toast({
          title: "Invalid QR code",
          description: `QR code is not a valid nostr url.`,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return;
      }
    }

    if (data.startsWith("npub")) {
      prefix = "npub";
      decoded = decodeBech32(data);
    } else if (data.startsWith("nsec")) {
      prefix = "nsec";
      decoded = decodeBech32(data);
    }

    if ((prefix !== "npub" && prefix !== "nsec") || !decoded) {
      toast({
        title: "Invalid QR code",
        description: `QR code is not a valid public or private key.`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    let foundKey: string | undefined = undefined;

    for (const item of decoded.tlvItems) {
      if (item.type === 0) {
        foundKey = item.value as string;
      }
    }

    if (!foundKey) {
      toast({
        title: "Invalid QR code",
        description: `QR code is not a valid public or private key.`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (prefix === "npub") {
      setNewPublicKey(foundKey);
      useNClient.getState().setKeyStore({
        keystore: "localstore",
        publicKey: foundKey,
        privateKey: "",
      });
      toast({
        title: "Public key loaded",
        description: `Public key loaded from QR code.`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } else if (prefix === "nsec") {
      console.log(`Setting private key from QR code`, foundKey);
      if (newPrivateKey === foundKey) {
        return;
      }
      setNewPrivateKey(foundKey);
      const publicKey = publicKeyFromPrivateKey(foundKey);
      useNClient.getState().setKeyStore({
        keystore: "localstore",
        publicKey: publicKey,
        privateKey: foundKey,
      });
      toast({
        title: "Keys loaded",
        description: `Private and public key loaded from QR code.`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } else {
      console.log(`Invalid prefix`, prefix);
    }

    setLoadKeyFromQr(false);
    return;
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

  const toggleQrReader = () => {
    setLoadKeyFromQr(!loadKeyFromQr);
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
            To post to Nostr, and respond to other users, you need to
            authenticate yourself.
          </Text>
        </>
      )}

      {loadKeyFromQr && (
        <>
          <Box marginBottom={2}>
            <Text marginBottom={2}>
              To post, scan your private key. Otherwise the public key is
              enough.
            </Text>
            <Button onClick={toggleQrReader}>Close QR Reader</Button>
          </Box>
          <QrReader
            onResult={(result, error) => {
              if (result) {
                setFromQr(result.toString());
              }

              if (error) {
                console.info(error);
              }
            }}
            constraints={{ facingMode: "environment" }}
          />
        </>
      )}

      <HStack marginTop={4}>
        {!loadKeyFromQr && (!keystore || keystore === "none") ? (
          <VStack>
            <Button
              leftIcon={<Icon as={PlusIcon} />}
              onClick={generateKeypair}
              width="100%"
            >
              New Account
            </Button>
            <Text>Have an account?</Text>
            <Button
              leftIcon={<Icon as={KeyChainVariantIcon} />}
              onClick={() => setKeyInputIsActive(true)}
              width="100%"
            >
              Enter Keypair
            </Button>
            <Button
              leftIcon={<Icon as={QrcodeScanIcon} />}
              onClick={toggleQrReader}
              width="100%"
            >
              Scan QR
            </Button>
            <Button
              leftIcon={<Icon as={ToyBrickOutlineIcon} />}
              isLoading={loadingPublicKeyNosx2}
              onClick={() => publicKeyFromExtention()}
              width="100%"
            >
              From Extention
            </Button>
          </VStack>
        ) : (
          <Button onClick={reset}>Reset</Button>
        )}
      </HStack>
      {keypair && (
        <Box mt={4}>
          {showPublicKeyInput && (
            <>
              <FormControl marginBottom={4}>
                <FormLabel>Public key:</FormLabel>
                <HStack spacing={2}>
                  <Input
                    type="text"
                    value={newPublicKey}
                    onChange={(e) => setNewPublicKey(e.target.value)}
                    isReadOnly
                  />

                  <QRCodeModal
                    kind={BECH32_PREFIX.PublicKeys}
                    value={newPublicKey}
                  />
                </HStack>
              </FormControl>
            </>
          )}

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
                <Button onClick={() => setShowPrivateKey(!showPrivateKey)}>
                  {showPrivateKey ? "Hide" : "Show"}
                </Button>
                <QRCodeModal
                  kind={BECH32_PREFIX.PrivateKeys}
                  value={newPrivateKey}
                />
              </HStack>
            </FormControl>
          )}

          {keyInputIsActive && (
            <Button onClick={() => saveKeyPair()}>Save</Button>
          )}
        </Box>
      )}
    </Box>
  );
}
