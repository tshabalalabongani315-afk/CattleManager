import { HStack, Box, Text } from "@chakra-ui/react";
import { useState, useEffect } from "react";

export default function DashboardWidgets() {
  const [cattle, setCattle] = useState([]);
  const [dailyEntries, setDailyEntries] = useState([]);

  useEffect(() => {
    // Demo data
    setCattle([{ tag_number: "TAG001" }, { tag_number: "TAG002" }]);
    setDailyEntries([
      { id: 1, tag_number: "TAG001", present: true },
      { id: 2, tag_number: "TAG002", present: false },
    ]);
  }, []);

  return (
    <HStack spacing={5} mb={5}>
      <Box bg="white" p={5} borderRadius="lg" flex="1" shadow="md">
        <Text fontWeight="bold">Total Cattle</Text>
        <Text fontSize="2xl">{cattle.length}</Text>
      </Box>
      <Box bg="white" p={5} borderRadius="lg" flex="1" shadow="md">
        <Text fontWeight="bold">Present Today</Text>
        <Text fontSize="2xl">{dailyEntries.filter((e) => e.present).length}</Text>
      </Box>
      <Box bg="white" p={5} borderRadius="lg" flex="1" shadow="md">
        <Text fontWeight="bold">Missing</Text>
        <Text fontSize="2xl">{dailyEntries.filter((e) => !e.present).length}</Text>
      </Box>
    </HStack>
  );
}
