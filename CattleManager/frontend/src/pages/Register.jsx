import { useEffect, useState } from "react";
import {
  Box,
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

export default function Register() {
  const [cattle, setCattle] = useState([]);
  const [tag, setTag] = useState("");
  const [breed, setBreed] = useState("");
  const [editId, setEditId] = useState(null);

  const load = async () => {
    const res = await axios.get("http://localhost:4000/cattle");
    setCattle(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!tag || !breed) return alert("Fill all fields");

    if (editId) {
      await axios.put(`http://localhost:4000/cattle/${editId}`, {
        tag,
        breed,
      });
    } else {
      await axios.post("http://localhost:4000/cattle", { tag, breed });
    }

    setTag("");
    setBreed("");
    setEditId(null);
    load();
  };

  const edit = item => {
    setEditId(item.id);
    setTag(item.tag);
    setBreed(item.breed);
  };

  const remove = async id => {
    if (!confirm("Delete this cattle?")) return;
    await axios.delete(`http://localhost:4000/cattle/${id}`);
    load();
  };

  return (
    <VStack spacing={6} align="stretch">
      <Box bg="white" p={6} rounded="lg" shadow="md" maxW="400px">
        <Heading size="md" mb={4}>
          {editId ? "Edit Cattle" : "Register Cattle"}
        </Heading>

        <VStack spacing={3}>
          <Input
            placeholder="Tag Number"
            value={tag}
            onChange={e => setTag(e.target.value)}
          />
          <Input
            placeholder="Breed"
            value={breed}
            onChange={e => setBreed(e.target.value)}
          />
          <Button colorScheme="green" w="full" onClick={save}>
            {editId ? "Update" : "Save"}
          </Button>
        </VStack>
      </Box>

      <Box bg="white" p={6} rounded="lg" shadow="md">
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
            {cattle.map(c => (
              <Tr key={c.id}>
                <Td>{c.tag}</Td>
                <Td>{c.breed}</Td>
                <Td>
                  <HStack>
                    <Button size="sm" onClick={() => edit(c)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="red"
                      onClick={() => remove(c.id)}
                    >
                      Delete
                    </Button>
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </VStack>
  );
}
