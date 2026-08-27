import { Box, Heading, Text, VStack, Progress } from "@chakra-ui/react";

export default function HerdStatus() {
  return (
    <Box bg="white" _dark={{ bg: "gray.800" }} p={6} rounded="xl" shadow="md">
      <Heading size="md" mb={4}>Herd Status</Heading>

      <VStack align="stretch" spacing={4}>
        <Stat label="Healthy" value={90} />
        <Stat label="Under Observation" value={8} />
        <Stat label="Critical" value={2} />
      </VStack>
    </Box>
  );
}

function Stat({ label, value }) {
  return (
    <Box>
      <Text fontSize="sm">{label}</Text>
      <Progress value={value} colorScheme="green" rounded="full" />
    </Box>
  );
}
