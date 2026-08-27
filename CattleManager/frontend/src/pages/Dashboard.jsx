import { Box, Heading, Text } from "@chakra-ui/react";
import PageTransition from "../components/PageTransition";

export default function Dashboard() {
  return (
    <PageTransition>
      <Box p={6} w="full">
        <Heading mb={2}>Dashboard</Heading>
        <Text color="gray.500">
          Live overview of your farm operations.
        </Text>
      </Box>
    </PageTransition>
  );
}
