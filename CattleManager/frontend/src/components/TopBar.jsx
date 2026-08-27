import { HStack, IconButton, Heading } from "@chakra-ui/react";
import { FiMenu } from "react-icons/fi";

export default function Topbar({ onToggle }) {
  return (
    <HStack
      bg="white"
      px={6}
      py={4}
      shadow="sm"
      justify="space-between"
    >
      <IconButton
        icon={<FiMenu />}
        onClick={onToggle}
        aria-label="Toggle sidebar"
        variant="ghost"
        fontSize="20px"
      />

      <Heading size="md">Cattle Manager</Heading>
    </HStack>
    
  );
}
