import { useEffect, useState } from "react";
import { Heading, Text } from "@chakra-ui/react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import Card from "../components/Card";
import PageTransition from "../components/PageTransition";
import { api } from "../api";
import { BREED_COLORS as COLORS } from "../utils/colors";

export default function Reports() {
  const [data, setData] = useState([]);

  useEffect(() => {
    api.get("/cattle").then((res) => {
      const grouped = {};
      res.data.forEach((c) => {
        grouped[c.breed] = (grouped[c.breed] || 0) + 1;
      });

      setData(
        Object.keys(grouped).map((breed) => ({
          name: breed,
          value: grouped[breed],
        }))
      );
    });
  }, []);

  return (
    <PageTransition>
      <Card>
        <Heading size="md" mb={6}>
          Breed Distribution
        </Heading>

        {data.length === 0 ? (
          <Text color="gray.500">No cattle registered yet.</Text>
        ) : (
          <PieChart width={360} height={320}>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={110}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        )}
      </Card>
    </PageTransition>
  );
}
