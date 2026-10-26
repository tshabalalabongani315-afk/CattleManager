import { Box, HStack, Icon, Skeleton, Text } from "@chakra-ui/react";
import Card from "../Card";

/** A single headline number with a label, optional icon, and small hint line. */
export default function StatCard({ label, value, hint, icon, tone = "brand", loading, children }) {
  const tones = {
    brand: { bg: "brand.50", fg: "brand.600", darkBg: "whiteAlpha.100", darkFg: "brand.300" },
    red: { bg: "red.50", fg: "red.600", darkBg: "whiteAlpha.100", darkFg: "red.300" },
    orange: { bg: "orange.50", fg: "orange.600", darkBg: "whiteAlpha.100", darkFg: "orange.300" },
    blue: { bg: "blue.50", fg: "blue.600", darkBg: "whiteAlpha.100", darkFg: "blue.300" },
  };
  const t = tones[tone] ?? tones.brand;

  return (
    <Card p={{ base: 4, md: 5 }}>
      <HStack justify="space-between" align="flex-start" mb={3}>
        <Text fontSize="sm" fontWeight="600" color="fg.muted">
          {label}
        </Text>
        {icon && (
          <Box
            display="grid"
            placeItems="center"
            w={8}
            h={8}
            borderRadius="lg"
            bg={t.bg}
            color={t.fg}
            _dark={{ bg: t.darkBg, color: t.darkFg }}
          >
            <Icon as={icon} boxSize={4} />
          </Box>
        )}
      </HStack>
      <Skeleton isLoaded={!loading} minH="36px" borderRadius="md">
        <Text fontSize="3xl" fontWeight="700" lineHeight="1.1" letterSpacing="-0.02em">
          {value ?? "—"}
        </Text>
      </Skeleton>
      {hint && (
        <Text mt={1.5} fontSize="xs" color="fg.muted">
          {hint}
        </Text>
      )}
      {children}
    </Card>
  );
}
