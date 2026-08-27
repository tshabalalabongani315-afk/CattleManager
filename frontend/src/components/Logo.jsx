import { HStack, Text } from "@chakra-ui/react";

function Mark({ size = 22, color = "#5E9C73" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="2" width="16" height="20" rx="5" fill={color} />
      <circle cx="12" cy="8" r="2.4" fill="#fff" opacity="0.4" />
    </svg>
  );
}

export default function Logo({ size = 22, textProps = {}, markColor }) {
  return (
    <HStack spacing={2.5}>
      <Mark size={size} color={markColor} />
      <Text fontWeight="700" letterSpacing="0.01em" {...textProps}>
        Cattle Manager
      </Text>
    </HStack>
  );
}
