import { Box } from "@chakra-ui/react";

export default function Card({ children, ...props }) {
  return (
    <Box
      bg="white"
      _dark={{ bg: "gray.800" }}
      p="6"
      borderRadius="2xl"
      boxShadow="md"
      transition="all 0.2s ease"
      _hover={{
        boxShadow: "lg",
      }}
      {...props}
    >
      {children}
    </Box>
  );
}
