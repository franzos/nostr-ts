import {
  HStack,
  Icon,
  IconButton,
  Spacer,
  Text,
  useToast,
} from "@chakra-ui/react";
import { sCDNAccountUploadRequest, sCDNUploadFile } from "@nostr-ts/web";
import { useNClient } from "../state/client";
import { useState } from "react";
import { toastErrorContent, toastSuccessContent } from "../lib/toast";
import TrashCanIcon from "mdi-react/TrashCanIcon";
import UploadIcon from "mdi-react/UploadIcon";
import FileOutlineIcon from "mdi-react/FileOutlineIcon";
import CheckCircleOutlineIcon from "mdi-react/CheckCircleOutlineIcon";
import CircleOutlineIcon from "mdi-react/CircleOutlineIcon";

interface FilUploadProps {
  file: File;
  onUploadDone: (result: { url: string; nip94?: string[][] }) => void;
  onRemove: (file: File) => void;
}

export function FileUpload({ file, onUploadDone, onRemove }: FilUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadDone, setIsUploadDone] = useState(false);
  const toast = useToast();

  const upload = async () => {
    setIsLoading(true);
    try {
      const req = sCDNAccountUploadRequest(file.name);
      const signedReq = await useNClient.getState().signEvent(req);

      const result = await sCDNUploadFile(signedReq, file);
      if (result) {
        setIsUploadDone(true);
        onUploadDone(result);
        toast(toastSuccessContent(`Uploaded ${file.name}`));
      }
    } catch (err) {
      console.error(err);
      toast(toastErrorContent(err as Error));
    }
    setIsLoading(false);
  };
  return (
    <HStack mb={1}>
      {isUploadDone ? (
        <Icon as={CheckCircleOutlineIcon} />
      ) : (
        <Icon as={CircleOutlineIcon} />
      )}
      <Icon as={FileOutlineIcon} />
      <Text fontSize={14}>{file.name}</Text>
      <Spacer />
      <IconButton
        icon={<Icon as={UploadIcon} />}
        onClick={upload}
        isLoading={isLoading}
        isDisabled={isUploadDone}
        aria-label="Upload"
        size="sm"
      >
        Upload
      </IconButton>
      <IconButton
        icon={<Icon as={TrashCanIcon} />}
        onClick={() => onRemove(file)}
        isLoading={isLoading}
        aria-label="Remove"
        size="sm"
      />
    </HStack>
  );
}
