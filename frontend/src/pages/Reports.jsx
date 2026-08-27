import { useEffect, useState } from "react";
import { Heading, Text } from "@chakra-ui/react";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import Card from "../components/Card";
import PageTransition from "../components/PageTransition";
import { API_BASE } from "../api";

const COLORS = ["#3F7D57", "#8E953F", "#B08642", "#5C7A8A", "#8A5C4E", "#6E6A8A"];

export default function Reports() {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get(`${API_BASE}/cattle`).then((res) => {
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
