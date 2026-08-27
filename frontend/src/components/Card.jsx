import { Box } from "@chakra-ui/react";

export default function Card({ children, ...props }) {
  return (
    <Box
      bg="rgba(255,255,255,0.65)"
      _dark={{ bg: "rgba(22,28,25,0.6)", borderColor: "whiteAlpha.200" }}
      backdropFilter="blur(16px) saturate(160%)"
      p="6"
      borderRadius="xl"
      border="1px solid"
      borderColor="blackAlpha.100"
      boxShadow="0 4px 24px rgba(20, 30, 25, 0.06)"
      {...props}
    >
      {children}
    </Box>
  );
}
