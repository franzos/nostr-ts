import {
  Box,
  Input,
  useMultiStyleConfig,
  InputProps,
  IconButton,
  Icon,
  Tooltip,
} from "@chakra-ui/react";
import FileUploadIcon from "mdi-react/FileUploadIcon";

interface FileInputProps extends InputProps {
  onSelection: (files: FileList) => void;
}

export const FileInput = (props: FileInputProps) => {
  const styles = useMultiStyleConfig("Button", { variant: "outline" });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      props.onSelection(e.target.files);
    }
  };

  return (
    <>
      {props.isDisabled ? (
        <Tooltip
          label="Setup a storage integration to upload files (Account > Integrations)."
          aria-label="A tooltip"
        >
          <IconButton
            icon={<Icon as={FileUploadIcon} />}
            variant="outline"
            zIndex="0"
            {...styles}
            aria-label="File upload"
            isDisabled={true}
          />
        </Tooltip>
      ) : (
        <Box position="relative" display="inline-block">
          <Input
            type="file"
            multiple // Allow multiple file selection
            onChange={handleFileChange}
            opacity="0"
            position="absolute"
            top="0"
            left="0"
            width="100%"
            height="100%"
            cursor="pointer"
            zIndex="1"
            {...props}
          />
          <IconButton
            icon={<Icon as={FileUploadIcon} />}
            variant="outline"
            zIndex="0"
            {...styles}
            aria-label="File upload"
          />
        </Box>
      )}
    </>
  );
};
