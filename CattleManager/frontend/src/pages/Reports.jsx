import { useEffect, useState } from "react";
import { Box, Heading } from "@chakra-ui/react";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip } from "recharts";

export default function Reports() {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:4000/cattle").then(res => {
      const grouped = {};
      res.data.forEach(c => {
        grouped[c.breed] = (grouped[c.breed] || 0) + 1;
      });

      setData(
        Object.keys(grouped).map(breed => ({
          name: breed,
          value: grouped[breed],
        }))
      );
    });
  }, []);

  return (
    <Box bg="white" _dark={{ bg: "gray.800" }} p={6} rounded="lg" shadow="md">
      <Heading size="md" mb={6}>
        Breed Distribution
      </Heading>

      <PieChart width={300} height={300}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          outerRadius={120}
        >
          {data.map((_, i) => (
            <Cell key={i} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </Box>
  );
}
