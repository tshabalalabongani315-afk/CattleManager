import { Box } from "@chakra-ui/react";

export default function Card({ children }) {
  return (
    <Box
      bg="white"
      p="6"
      borderRadius="2xl"
      boxShadow="md"
      transition="all 0.2s ease"
      _hover={{
        boxShadow: "xl",
        transform: "translateY(-2px)",
      }}
    >
      {children}
    </Box>
  );
}
