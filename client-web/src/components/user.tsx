import { UserBase } from "@nostr-ts/common";
import { useNClient } from "../state/client";
import { UserInfo } from "./user-info";
import { UserOptions } from "../lib/user-properties";

export function User({
  user,
  options,
}: {
  user: UserBase;
  options: UserOptions;
}) {
  const [following] = useNClient((state) => [
    state.followingUserIds.find((f) => f === user.pubkey),
  ]);

  return (
    <UserInfo
      user={user}
      opts={{
        ...options,
        following: !!following,
      }}
    />
  );
}
