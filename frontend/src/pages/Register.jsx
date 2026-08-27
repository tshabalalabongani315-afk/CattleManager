import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Text,
} from "@chakra-ui/react";
import axios from "axios";
import Card from "../components/Card";
import PageTransition from "../components/PageTransition";
import { API_BASE } from "../api";

export default function Register() {
  const navigate = useNavigate();
  const [cattle, setCattle] = useState([]);
  const [tag, setTag] = useState("");
  const [breed, setBreed] = useState("");
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cattle;
    return cattle.filter(
      (c) => c.tag.toLowerCase().includes(q) || c.breed.toLowerCase().includes(q)
    );
  }, [cattle, search]);

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
          <HStack justify="space-between" mb={4}>
            <Heading size="md">Registered Cattle</Heading>
            <Input
              placeholder="Search tag or breed…"
              size="sm"
              maxW="240px"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </HStack>

          {filtered.length === 0 ? (
            <Text color="gray.500">No cattle match your search.</Text>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Tag</Th>
                  <Th>Breed</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filtered.map((c) => (
                  <Tr
                    key={c.id}
                    _hover={{ bg: "blackAlpha.50" }}
                    _dark={{ _hover: { bg: "whiteAlpha.100" } }}
                    cursor="pointer"
                    onClick={() => navigate(`/cattle/${c.id}`)}
                  >
                    <Td fontWeight="medium">{c.tag}</Td>
                    <Td>{c.breed}</Td>
                    <Td onClick={(e) => e.stopPropagation()}>
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
          )}
        </Card>
      </VStack>
    </PageTransition>
  );
}
