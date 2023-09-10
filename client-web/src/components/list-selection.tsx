import { useEffect, useState } from "react";
import { useNClient } from "../state/client";
import { RadioGroup, Stack, Radio } from "@chakra-ui/react";

export interface ListsProps {
  showFollowing: boolean;
  showMentions: boolean;
  changeFeed: (value: string) => void;
}

export function ListSelection({
  showFollowing,
  showMentions,
  changeFeed,
}: ListsProps) {
  const [lists, setLists] = useState<
    {
      id: string;
      title: string;
    }[]
  >([]);

  const [activeListId, setActiveListId] = useState<string>("global");

  const onMount = async () => {
    const lists = await useNClient.getState().getAllLists();
    if (lists) {
      setLists(
        lists.map((item) => ({
          id: item.id,
          title: item.title,
        }))
      );
    }
  };

  const onUnmount = () => {
    setLists([]);
  };

  const onChange = (activeListId: string) => {
    setActiveListId(activeListId);
    changeFeed(activeListId);
  };

  useEffect(() => {
    onMount();
    return onUnmount;
  }, []);

  return (
    <RadioGroup onChange={onChange} value={activeListId}>
      <Stack direction="row">
        <Radio value="global">Global</Radio>
        {showFollowing && <Radio value="following">Following</Radio>}
        {showMentions && <Radio value="mentions">Mentions</Radio>}
        {lists &&
          lists.length > 0 &&
          lists.map((list) => (
            <Radio key={list.id} value={list.id}>
              {list.title}
            </Radio>
          ))}
      </Stack>
    </RadioGroup>
  );
}
