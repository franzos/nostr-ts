import { UseToastOptions } from "@chakra-ui/react";

export function toastErrorContent(
  err: Error,
  message?: string
): UseToastOptions {
  return {
    title: message || "Error",
    description: err.message,
    status: "error",
    duration: 9000,
    isClosable: true,
  };
}

export function toastSuccessContent(message: string): UseToastOptions {
  return {
    title: message,
    status: "success",
    duration: 9000,
    isClosable: true,
  };
}
