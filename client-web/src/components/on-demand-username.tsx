import { Link } from "@chakra-ui/react";
import { NavLink } from "react-router-dom";
import { useNClient } from "../state/client";
import { UserRecord, decodeBech32 } from "@nostr-ts/common";
import { useEffect, useRef, useState } from "react";
import { excerpt } from "../lib/excerpt";

interface OnDemandUsernameProps {
  npub?: string;
}

export function OnDemandUsername({ npub }: OnDemandUsernameProps) {
  const [status] = useNClient((state) => [state.status]);

  const pubkey = useRef<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [profileLink, setProfileLink] = useState<string>("");
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(false);

  const usernameFromUser = (record: UserRecord) => {
    const data = record.user.data;
    return data && data.display_name ? `@${data.display_name}` : "";
  };

  const fetchUser = async (pk: string, retryCount: number = 0) => {
    if (retryCount > 20) {
      setIsLoadingUser(false);
      return;
    }

    const user = await useNClient.getState().getUser(pk);

    if (user) {
      setUsername(usernameFromUser(user));
      setIsLoadingUser(false);
    } else {
      if (retryCount === 2) {
        await useNClient.getState().requestInformation(
          {
            idsOrKeys: [pk],
            source: "users",
          },
          { timeoutIn: 10000 }
        );
      }

      setTimeout(() => fetchUser(pk, retryCount + 1), 1000);
    }
  };

  useEffect(() => {
    if (!npub || !["online", "offline"].includes(status)) return;

    try {
      const decoded = decodeBech32(npub);
      const pkItem = decoded.tlvItems.find((item) => item.type === 0);

      if (pkItem) {
        pubkey.current = pkItem.value as string;
        setProfileLink(`/p/${npub}`);
        setIsLoadingUser(true);
        fetchUser(pubkey.current);
      }
    } catch (e) {
      console.error("Error decoding bech32:", e);
    }
  }, [status, npub]);

  return (
    <>
      {npub ? (
        <Link as={NavLink} to={profileLink} color={"gray.500"}>
          {username === "" || isLoadingUser ? excerpt(npub, 10) : username}
        </Link>
      ) : (
        <>...</>
      )}
    </>
  );
}
