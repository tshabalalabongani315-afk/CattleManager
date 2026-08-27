import { Box } from "@chakra-ui/react";

export default function Card({ children, ...props }) {
  return (
    <Box
      bg="white"
      _dark={{ bg: "ink.700", borderColor: "whiteAlpha.100" }}
      p="6"
      borderRadius="xl"
      border="1px solid"
      borderColor="blackAlpha.100"
      boxShadow="sm"
      {...props}
    >
      {children}
    </Box>
  );
}
