import { Center, Spinner } from "@chakra-ui/react";

export default function PageSpinner({ fullScreen }) {
  return (
    <Center minH={fullScreen ? "100vh" : "240px"} role="status" aria-label="Loading">
      <Spinner size="lg" color="brand.500" thickness="3px" />
    </Center>
  );
}
