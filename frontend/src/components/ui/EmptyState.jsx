import { Box, Heading, Icon, Text, VStack } from "@chakra-ui/react";

/** Friendly "nothing here yet" block with an optional call to action. */
export default function EmptyState({ icon, title, description, action }) {
  return (
    <VStack spacing={3} py={{ base: 8, md: 12 }} px={4} textAlign="center">
      {icon && (
        <Box
          display="grid"
          placeItems="center"
          w={12}
          h={12}
          borderRadius="full"
          bg="surface.muted"
          color="brand.fg"
        >
          <Icon as={icon} boxSize={5} />
        </Box>
      )}
      <Heading as="h3" size="sm">
        {title}
      </Heading>
      {description && (
        <Text color="fg.muted" fontSize="sm" maxW="42ch">
          {description}
        </Text>
      )}
      {action}
    </VStack>
  );
}
