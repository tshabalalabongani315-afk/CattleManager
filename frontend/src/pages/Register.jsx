import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Input,
  Select,
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
  Badge,
  Icon,
} from "@chakra-ui/react";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";
import Card from "../components/Card";
import PageTransition from "../components/PageTransition";
import { api } from "../api";
import { downloadCSV } from "../utils/csv";
import { formatAge } from "../utils/age";
import { STATUS_COLORS } from "../utils/colors";

const PAGE_SIZE = 20;
const STATUSES = ["Active", "Sold", "Deceased"];

export default function Register() {
  const navigate = useNavigate();
  const [cattle, setCattle] = useState([]);
  const [tag, setTag] = useState("");
  const [breed, setBreed] = useState("");
  const [sex, setSex] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [status, setStatus] = useState("Active");
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [breedFilter, setBreedFilter] = useState("");
  const [sortKey, setSortKey] = useState("tag");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);

  const load = async () => {
    const res = await api.get("/cattle");
    setCattle(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, breedFilter, sortKey, sortDir]);

  const resetForm = () => {
    setTag("");
    setBreed("");
    setSex("");
    setDateOfBirth("");
    setStatus("Active");
    setEditId(null);
  };

  const save = async () => {
    if (!tag || !breed) return alert("Fill all fields");

    const payload = { tag, breed, sex: sex || null, date_of_birth: dateOfBirth || null, status };

    if (editId) {
      await api.put(`/cattle/${editId}`, payload);
    } else {
      await api.post("/cattle", payload);
    }

    resetForm();
    load();
  };

  const edit = (item) => {
    setEditId(item.id);
    setTag(item.tag);
    setBreed(item.breed);
    setSex(item.sex || "");
    setDateOfBirth(item.date_of_birth || "");
    setStatus(item.status || "Active");
  };

  const remove = async (id) => {
    if (!confirm("Delete this cattle?")) return;
    await api.delete(`/cattle/${id}`);
    load();
  };

  const breeds = useMemo(
    () => [...new Set(cattle.map((c) => c.breed).filter(Boolean))].sort(),
    [cattle]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cattle.filter((c) => {
      const matchesSearch =
        !q || c.tag.toLowerCase().includes(q) || c.breed.toLowerCase().includes(q);
      const matchesBreed = !breedFilter || c.breed === breedFilter;
      return matchesSearch && matchesBreed;
    });
  }, [cattle, search, breedFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];

      if (sortKey === "date_of_birth") {
        av = av ? new Date(av).getTime() : -Infinity;
        bv = bv ? new Date(bv).getTime() : -Infinity;
      } else {
        av = (av ?? "").toString().toLowerCase();
        bv = (bv ?? "").toString().toLowerCase();
      }

      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const exportCSV = () => {
    downloadCSV(
      "cattle-register.csv",
      [
        { key: "tag", label: "Tag" },
        { key: "breed", label: "Breed" },
        { key: "sex", label: "Sex" },
        { key: "date_of_birth", label: "Date of Birth" },
        { key: "status", label: "Status" },
      ],
      sorted
    );
  };

  return (
    <PageTransition>
      <VStack spacing={6} align="stretch">
        <Card maxW="440px">
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
            <HStack w="full">
              <Select placeholder="Sex" value={sex} onChange={(e) => setSex(e.target.value)}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </Select>
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </HStack>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <HStack w="full">
              <Button colorScheme="brand" w="full" onClick={save}>
                {editId ? "Update" : "Save"}
              </Button>
              {editId && (
                <Button variant="ghost" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </HStack>
          </VStack>
        </Card>

        <Card>
          <HStack justify="space-between" mb={4} flexWrap="wrap" gap={3}>
            <Heading size="md">Registered Cattle</Heading>
            <HStack flexWrap="wrap" gap={2}>
              <Input
                placeholder="Search tag or breed…"
                size="sm"
                maxW="200px"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select
                size="sm"
                maxW="160px"
                value={breedFilter}
                onChange={(e) => setBreedFilter(e.target.value)}
              >
                <option value="">All Breeds</option>
                {breeds.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
              <Button size="sm" onClick={exportCSV} isDisabled={sorted.length === 0}>
                Export CSV
              </Button>
            </HStack>
          </HStack>

          {sorted.length === 0 ? (
            <Text color="gray.500">No cattle match your filters.</Text>
          ) : (
            <>
              <Table>
                <Thead>
                  <Tr>
                    <SortTh label="Tag" sortKey="tag" current={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortTh label="Breed" sortKey="breed" current={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortTh label="Sex" sortKey="sex" current={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortTh
                      label="Age"
                      sortKey="date_of_birth"
                      current={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortTh label="Status" sortKey="status" current={sortKey} dir={sortDir} onSort={toggleSort} />
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {paginated.map((c) => (
                    <Tr
                      key={c.id}
                      _hover={{ bg: "blackAlpha.50" }}
                      _dark={{ _hover: { bg: "whiteAlpha.100" } }}
                      cursor="pointer"
                      onClick={() => navigate(`/cattle/${c.id}`)}
                    >
                      <Td fontWeight="medium">{c.tag}</Td>
                      <Td>{c.breed}</Td>
                      <Td>{c.sex || "—"}</Td>
                      <Td>{formatAge(c.date_of_birth) || "—"}</Td>
                      <Td>
                        <Badge colorScheme={STATUS_COLORS[c.status] || "gray"}>
                          {c.status || "Active"}
                        </Badge>
                      </Td>
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

              {totalPages > 1 && (
                <HStack justify="space-between" mt={4}>
                  <Text fontSize="sm" color="gray.500">
                    Page {currentPage} of {totalPages} &middot; {sorted.length} animals
                  </Text>
                  <HStack>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      isDisabled={currentPage === 1}
                    >
                      Prev
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      isDisabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </HStack>
                </HStack>
              )}
            </>
          )}
        </Card>
      </VStack>
    </PageTransition>
  );
}

function SortTh({ label, sortKey, current, dir, onSort }) {
  const active = current === sortKey;
  return (
    <Th cursor="pointer" userSelect="none" onClick={() => onSort(sortKey)}>
      <HStack spacing={1}>
        <Text>{label}</Text>
        {active && <Icon as={dir === "asc" ? FiChevronUp : FiChevronDown} boxSize={3} />}
      </HStack>
    </Th>
  );
}
