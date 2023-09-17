import {
  Box,
  Button,
  Heading,
  Progress,
  Skeleton,
  Stack,
} from "@chakra-ui/react";
import { UserRecord } from "@nostr-ts/common";
import { useEffect, useRef, useState } from "react";
import { UserInfo } from "./user-info";
import { useNClient } from "../state/client";

export function PopularUsersList() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const calculationCheckInterval = useRef(0);

  const calculate = async () => {
    await useNClient
      .getState()
      .getPopularUsers()
      .then((r) => {
        if (r && r.length > 0) {
          setProgressPercent(100);
          clearInterval(calculationCheckInterval.current);
          setUsers(r);
        } else {
          if (progressPercent < 70) {
            setProgressPercent((prevProgress) => prevProgress + 5);
          } else if (progressPercent < 90) {
            setProgressPercent((prevProgress) => prevProgress + 1);
          }
        }
      });
  };

  const onMount = async () => {
    setUsers([]);
    setProgressPercent(0);
    calculationCheckInterval.current = setInterval(async () => {
      await calculate();
    }, 1000);
  };

  useEffect(() => {
    onMount();

    return () => {
      if (calculationCheckInterval.current) {
        clearInterval(calculationCheckInterval.current);
      }
    };
  }, []);

  const refresh = async () => {
    setIsLoading(true);
    await useNClient.getState().calculatePopular();
    await onMount();
    setIsLoading(false);
  };

  const LoadingSkeleton = (
    <>
      <Progress size="xs" mb={2} hasStripe value={progressPercent} />
      <Stack>
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton height="32px" mb={2} key={index} />
        ))}
      </Stack>
    </>
  );

  return (
    <Box>
      <Heading as="h2" size="md" marginBottom={4}>
        Hot right now
      </Heading>
      {!isLoading && progressPercent === 100 ? (
        <Button onClick={refresh} size="xs" marginBottom={2}>
          Refresh
        </Button>
      ) : (
        <Button onClick={onMount} size="xs" disabled={true} marginBottom={2}>
          Calculating ...
        </Button>
      )}
      {users.length > 0
        ? users.map((user, index) => (
            <UserInfo
              key={index}
              user={user.user}
              opts={{
                showAbout: false,
                showBanner: false,
                following: false,
                showFollowing: false,
                showBlock: false,
                relayUrls: [],
                isBlocked: false,
              }}
            />
          ))
        : LoadingSkeleton}
    </Box>
  );
}
