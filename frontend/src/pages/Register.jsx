import { useEffect, useState } from "react";
import {
  Input,
  Button,
  Heading,
  VStack,
  HStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from "@chakra-ui/react";
import axios from "axios";
import Card from "../components/Card";
import PageTransition from "../components/PageTransition";
import { API_BASE } from "../api";

export default function Register() {
  const [cattle, setCattle] = useState([]);
  const [tag, setTag] = useState("");
  const [breed, setBreed] = useState("");
  const [editId, setEditId] = useState(null);

  const load = async () => {
    const res = await axios.get(`${API_BASE}/cattle`);
    setCattle(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!tag || !breed) return alert("Fill all fields");

    if (editId) {
      await axios.put(`${API_BASE}/cattle/${editId}`, { tag, breed });
    } else {
      await axios.post(`${API_BASE}/cattle`, { tag, breed });
    }

    setTag("");
    setBreed("");
    setEditId(null);
    load();
  };

  const edit = (item) => {
    setEditId(item.id);
    setTag(item.tag);
    setBreed(item.breed);
  };

  const remove = async (id) => {
    if (!confirm("Delete this cattle?")) return;
    await axios.delete(`${API_BASE}/cattle/${id}`);
    load();
  };

  return (
    <PageTransition>
      <VStack spacing={6} align="stretch">
        <Card maxW="420px">
          <Heading size="md" mb={4}>
            {editId ? "Edit Cattle" : "Register Cattle"}
          </Heading>

          <VStack spacing={3}>
            <Input
              placeholder="Tag Number"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            />
            <Input
              placeholder="Breed"
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
            />
            <Button colorScheme="brand" w="full" onClick={save}>
              {editId ? "Update" : "Save"}
            </Button>
          </VStack>
        </Card>

        <Card>
          <Heading size="md" mb={4}>
            Registered Cattle
          </Heading>

          <Table>
            <Thead>
              <Tr>
                <Th>Tag</Th>
                <Th>Breed</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {cattle.map((c) => (
                <Tr key={c.id}>
                  <Td>{c.tag}</Td>
                  <Td>{c.breed}</Td>
                  <Td>
                    <HStack>
                      <Button size="sm" onClick={() => edit(c)}>
                        Edit
                      </Button>
                      <Button size="sm" colorScheme="red" onClick={() => remove(c.id)}>
                        Delete
                      </Button>
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      </VStack>
    </PageTransition>
  );
}
