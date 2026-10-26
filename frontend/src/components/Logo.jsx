import { HStack, Text } from "@chakra-ui/react";

export function LogoMark({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#2F6244" />
      <rect x="9" y="5" width="14" height="22" rx="6" fill="#86B896" />
      <circle cx="16" cy="11.5" r="2.6" fill="#fff" opacity=".55" />
    </svg>
  );
}

export default function Logo({ size = 24, textProps = {} }) {
  return (
    <HStack spacing={2.5}>
      <LogoMark size={size} />
      <Text fontWeight="700" letterSpacing="-0.01em" {...textProps}>
        Cattle Manager
      </Text>
    </HStack>
  );
}
