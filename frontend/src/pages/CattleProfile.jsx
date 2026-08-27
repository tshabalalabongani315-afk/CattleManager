import { useEffect, useState } from "react";
import { useParams, useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Input,
  Badge,
  Icon,
} from "@chakra-ui/react";
import { FiArrowLeft } from "react-icons/fi";
import axios from "axios";
import Card from "../components/Card";
import PageTransition from "../components/PageTransition";
import VaccinationHistory from "../components/VaccinationHistory";
import WeightHistory from "../components/WeightHistory";
import { API_BASE } from "../api";
import { formatAge } from "../utils/age";
import { STATUS_COLORS } from "../utils/colors";

export default function CattleProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [animal, setAnimal] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tag, setTag] = useState("");
  const [breed, setBreed] = useState("");

  const load = async () => {
    try {
      const res = await axios.get(`${API_BASE}/cattle/${id}`);
      setAnimal(res.data);
      setTag(res.data.tag);
      setBreed(res.data.breed);
    } catch {
      setNotFound(true);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const save = async () => {
    if (!tag || !breed) return alert("Fill all fields");
    await axios.put(`${API_BASE}/cattle/${id}`, { tag, breed });
    setEditing(false);
    load();
  };

  const remove = async () => {
    if (!confirm("Delete this animal? This cannot be undone.")) return;
    await axios.delete(`${API_BASE}/cattle/${id}`);
    navigate("/register");
  };

  if (notFound) {
    return (
      <PageTransition>
        <Card>
          <Text color="gray.500">Animal not found.</Text>
        </Card>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <VStack align="stretch" spacing={6}>
        <Button
          as={RouterLink}
          to="/register"
          variant="ghost"
          size="sm"
          alignSelf="flex-start"
          leftIcon={<Icon as={FiArrowLeft} />}
        >
          Back to Register
        </Button>

        <Card>
          {!animal ? (
            <Text color="gray.500">Loading…</Text>
          ) : editing ? (
            <VStack align="stretch" spacing={3} maxW="360px">
              <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Tag Number" />
              <Input value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Breed" />
              <HStack>
                <Button colorScheme="brand" onClick={save}>
                  Save
                </Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </HStack>
            </VStack>
          ) : (
            <HStack justify="space-between" align="flex-start">
              <VStack align="start" spacing={1}>
                <HStack>
                  <Heading size="lg">{animal.tag}</Heading>
                  <Badge colorScheme="brand">{animal.breed}</Badge>
                  <Badge colorScheme={STATUS_COLORS[animal.status] || "gray"}>
                    {animal.status || "Active"}
                  </Badge>
                </HStack>
                <Text color="gray.500" fontSize="sm">
                  Animal #{animal.id}
                  {animal.sex && ` · ${animal.sex}`}
                  {formatAge(animal.date_of_birth) && ` · ${formatAge(animal.date_of_birth)} old`}
                </Text>
              </VStack>
              <HStack>
                <Button size="sm" onClick={() => setEditing(true)}>
                  Edit
                </Button>
                <Button size="sm" colorScheme="red" variant="outline" onClick={remove}>
                  Delete
                </Button>
              </HStack>
            </HStack>
          )}
        </Card>

        <Card>
          <VaccinationHistory cattleId={id} />
        </Card>

        <Card>
          <WeightHistory cattleId={id} />
        </Card>
      </VStack>
    </PageTransition>
  );
}
