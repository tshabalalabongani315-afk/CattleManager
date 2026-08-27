import { Box, Text, HStack, Input, Button } from "@chakra-ui/react";
import { useState } from "react";

export default function QuickAddCattle() {
  const [newTag, setNewTag] = useState("");

  const addCattle = () => {
    if (!newTag) return;
    alert(`Cattle ${newTag} added!`);
    setNewTag("");
  };

  return (
    <Box bg="white" _dark={{ bg: "gray.800" }}p={5} borderRadius="lg" shadow="md" mb={5}>
      <Text fontWeight="bold" mb={3}>
        Add New Cattle
      </Text>
      <HStack>
        <Input
          placeholder="Tag Number"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
        />
        <Button colorScheme="green" onClick={addCattle}>
          Add
        </Button>
      </HStack>
    </Box>
  );
}
