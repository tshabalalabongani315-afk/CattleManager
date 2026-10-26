import { Box } from "@chakra-ui/react";

/** The one surface style used across the app: flat, bordered, subtly raised. */
export default function Card({ children, ...props }) {
  return (
    <Box
      bg="surface"
      p={{ base: 4, md: 6 }}
      borderRadius="xl"
      border="1px solid"
      borderColor="line"
      boxShadow="0 1px 2px rgba(16, 24, 19, 0.04)"
      {...props}
    >
      {children}
    </Box>
  );
}
