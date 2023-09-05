import {
  Box,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  useToast,
  FormHelperText,
  ButtonGroup,
} from "@chakra-ui/react";
import {
  CLIENT_MESSAGE_TYPE,
  NEVENT_KIND,
  NFilters,
  NewUpdateUserMetadata,
  UserMetadata,
} from "@nostr-ts/common";
import { useEffect, useRef, useState } from "react";
import { useNClient } from "../state/client";

interface UserProfileFormProps {
  pubkey: string;
  metadata?: UserMetadata;
}

export function UserProfileForm({ props }: { props: UserProfileFormProps }) {
  const [userMetadata, setUserMetadata] = useState<UserMetadata>({
    name: "",
    display_name: "",
    picture: "",
    banner: "",
    nip05: "",
    website: "",
    about: "",
    image: "",
    lud16: "",
    lud06: "",
  });
  const [mastodonUrl, setMastodonUrl] = useState<string>("");
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const hasChanges = useRef<boolean>(false);

  const toast = useToast();

  useEffect(() => {
    if (props.metadata && !hasChanges.current) {
      setUserMetadata(Object.assign(userMetadata, props.metadata));
    }
  }, [props.metadata]);

  const updateData = async () => {
    setIsBusy(true);
    const obj: Record<string, string> = {}; // specify type here
    for (const [key, value] of Object.entries(userMetadata)) {
      if (value && value !== "") {
        obj[key] = value;
      }
    }
    const ev = NewUpdateUserMetadata({
      userMetadata: obj as UserMetadata,
      mastodonUrl,
    });
    if (Object.keys(obj).length === 0) {
      toast({
        title: "No changes",
        description: "No changes to update.",
        status: "info",
        duration: 5000,
        isClosable: true,
      });
      setIsBusy(false);
      return;
    }
    try {
      await useNClient.getState().signAndSendEvent({
        event: ev,
      });
      setIsBusy(false);
      await useNClient.getState().subscribe({
        type: CLIENT_MESSAGE_TYPE.REQ,
        filters: new NFilters({
          authors: [props.pubkey],
          kinds: [NEVENT_KIND.METADATA],
        }),
        options: {
          timeoutIn: 10000,
          view: "user-profile",
        },
      });
    } catch (e) {
      console.error(e);
      setIsBusy(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setUserMetadata((prev) => ({ ...prev, [name]: value }));
    hasChanges.current = true;
  };

  return (
    <Box marginBottom={10}>
      <FormControl id="name" mb={4}>
        <FormLabel>Name</FormLabel>
        <Input name="name" value={userMetadata.name} onChange={handleChange} />
      </FormControl>

      <FormControl id="display_name" mb={4}>
        <FormLabel>Display Name</FormLabel>
        <Input
          name="display_name"
          value={userMetadata.display_name || ""}
          onChange={handleChange}
        />
      </FormControl>

      <FormControl id="website" mb={4}>
        <FormLabel>Website</FormLabel>
        <Input
          name="website"
          value={userMetadata.website || ""}
          onChange={handleChange}
        />
      </FormControl>

      <FormControl id="about" mb={4}>
        <FormLabel>About</FormLabel>
        <Textarea
          name="about"
          value={userMetadata.about || ""}
          onChange={handleChange}
        />
      </FormControl>

      <FormControl id="picture" mb={4}>
        <FormLabel>Picture URL</FormLabel>
        <Input
          name="picture"
          value={userMetadata.picture || ""}
          onChange={handleChange}
        />
        <FormHelperText>URL for your profile picture.</FormHelperText>
      </FormControl>

      <FormControl id="banner" mb={4}>
        <FormLabel>Banner URL</FormLabel>
        <Input
          name="banner"
          value={userMetadata.banner || ""}
          onChange={handleChange}
        />
        <FormHelperText>URL for your profile banner.</FormHelperText>
      </FormControl>

      <FormControl id="image" mb={4}>
        <FormLabel>Image URL</FormLabel>
        <Input
          name="image"
          value={userMetadata.image || ""}
          onChange={handleChange}
        />
        <FormHelperText>URL for an additional image.</FormHelperText>
      </FormControl>

      {/* Add other form fields similarly */}
      <FormControl id="nip05" mb={4}>
        <FormLabel>NIP05</FormLabel>
        <Input
          name="nip05"
          value={userMetadata.nip05 || ""}
          onChange={handleChange}
        />
        <FormHelperText>
          Static internet identifier. For ex. username@somewallet.com
        </FormHelperText>
      </FormControl>

      <FormControl id="lud16" mb={4}>
        <FormLabel>LUD16</FormLabel>
        <Input
          name="lud16"
          value={userMetadata.lud16 || ""}
          onChange={handleChange}
        />
        <FormHelperText>
          Static internet identifier. For ex. username@somewallet.com
        </FormHelperText>
      </FormControl>

      <FormControl id="lud06" mb={4}>
        <FormLabel>LUD06</FormLabel>
        <Input
          name="lud06"
          value={userMetadata.lud06 || ""}
          onChange={handleChange}
        />
        <FormHelperText>bech32 encoded lnurl</FormHelperText>
      </FormControl>

      <FormControl id="mastodonUrl" mb={4}>
        <FormLabel>Mastodon URL</FormLabel>
        <Input
          name="mastodonUrl"
          value={mastodonUrl}
          onChange={(e) => setMastodonUrl(e.target.value)}
        />
      </FormControl>

      <ButtonGroup>
        <Button
          colorScheme="blue"
          type="submit"
          isLoading={isBusy}
          onClick={updateData}
        >
          Send update
        </Button>
        <Button
          isDisabled={!hasChanges.current}
          onClick={() => (hasChanges.current = false)}
        >
          Reset
        </Button>
      </ButtonGroup>
    </Box>
  );
}
