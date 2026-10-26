import { Box, Flex, Heading, Text } from "@chakra-ui/react";

/** Page title, one-line description, and the page's primary action(s) on the right. */
export default function PageHeader({ title, description, actions, children }) {
  return (
    <Flex
      mb={{ base: 5, md: 7 }}
      gap={4}
      align={{ base: "stretch", sm: "flex-end" }}
      justify="space-between"
      direction={{ base: "column", sm: "row" }}
    >
      <Box minW={0}>
        {children}
        <Heading as="h1" size={{ base: "lg", md: "xl" }}>
          {title}
        </Heading>
        {description && (
          <Text color="fg.muted" mt={1.5} maxW="62ch">
            {description}
          </Text>
        )}
      </Box>
      {actions && (
        <Flex gap={2} flexShrink={0} flexWrap="wrap">
          {actions}
        </Flex>
      )}
    </Flex>
  );
}
