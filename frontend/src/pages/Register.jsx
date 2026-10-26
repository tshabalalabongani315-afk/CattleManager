import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Badge,
  Button,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Select,
  Skeleton,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
} from "@chakra-ui/react";
import { FiChevronDown, FiChevronUp, FiDownload, FiEdit2, FiMoreHorizontal, FiPlus, FiSearch, FiTrash2, FiUsers } from "react-icons/fi";
import Card from "../components/Card";
import PageTransition from "../components/PageTransition";
import CattleFormModal from "../components/CattleFormModal";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import { api } from "../api";
import { useFetch } from "../hooks/useFetch";
import { useConfirm } from "../hooks/confirmContext";
import { useNotify } from "../hooks/useNotify";
import { downloadCSV } from "../utils/csv";
import { formatAge } from "../utils/age";
import { STATUS_COLORS } from "../utils/colors";

const PAGE_SIZE = 20;

export default function Register() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const notify = useNotify();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: cattle, loading, error, reload } = useFetch("/cattle");

  const form = useDisclosure();
  const [editing, setEditing] = useState(null);

  const [search, setSearch] = useState("");
  const [breedFilter, setBreedFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState("tag");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);

  // "Add animal" links elsewhere in the app arrive as /register?new=1.
  const { onOpen: openForm } = form;
  useEffect(() => {
    if (searchParams.get("new")) {
      openForm();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, openForm]);

  const rows = useMemo(() => cattle ?? [], [cattle]);

  const breeds = useMemo(() => [...new Set(rows.map((c) => c.breed).filter(Boolean))].sort(), [rows]);

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = rows.filter(
      (c) =>
        (!q || c.tag.toLowerCase().includes(q) || c.breed.toLowerCase().includes(q)) &&
        (!breedFilter || c.breed === breedFilter) &&
        (!statusFilter || c.status === statusFilter)
    );

    const value = (c) =>
      sortKey === "date_of_birth" ? (c.date_of_birth ?? "") : String(c[sortKey] ?? "").toLowerCase();
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort(
      (a, b) => dir * value(a).localeCompare(value(b), undefined, { numeric: true })
    );
  }, [rows, search, breedFilter, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const changeFilter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const openAdd = () => {
    setEditing(null);
    form.onOpen();
  };
  const openEdit = (animal) => {
    setEditing(animal);
    form.onOpen();
  };

  const remove = async (animal) => {
    const ok = await confirm({
      title: `Delete ${animal.tag}?`,
      body: "This also removes its vaccination and weight history. It can't be undone.",
      confirmLabel: "Delete animal",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/cattle/${animal.id}`);
      notify.success(`${animal.tag} deleted`);
      reload();
    } catch (err) {
      notify.error(err, "Couldn't delete the animal");
    }
  };

  const exportCSV = () =>
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

  return (
    <PageTransition>
      <PageHeader
        title="Register"
        description="Every animal on the farm. Click a row for its vaccination and weight history."
        actions={
          <>
            <Button variant="subtle" leftIcon={<FiDownload />} onClick={exportCSV} isDisabled={sorted.length === 0}>
              Export CSV
            </Button>
            <Button leftIcon={<FiPlus />} onClick={openAdd}>
              Add animal
            </Button>
          </>
        }
      />

      <Card p={0} overflow="hidden">
        {error && !cattle ? (
          <ErrorState error={error} onRetry={reload} title="Couldn't load the register" />
        ) : loading ? (
          <Stack p={5} spacing={3}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} h="44px" borderRadius="lg" />
            ))}
          </Stack>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={FiUsers}
            title="Your register is empty"
            description="Add your first animal to start tracking vaccinations, weights and counts."
            action={
              <Button leftIcon={<FiPlus />} onClick={openAdd}>
                Add your first animal
              </Button>
            }
          />
        ) : (
          <>
            <HStack p={4} spacing={3} flexWrap="wrap" borderBottom="1px solid" borderColor="line">
              <InputGroup maxW={{ base: "full", sm: "280px" }} flex={{ base: "1 1 100%", sm: "0 1 auto" }}>
                <InputLeftElement pointerEvents="none">
                  <Icon as={FiSearch} color="fg.muted" />
                </InputLeftElement>
                <Input
                  placeholder="Search tag or breed"
                  aria-label="Search tag or breed"
                  value={search}
                  onChange={changeFilter(setSearch)}
                />
              </InputGroup>
              <Select aria-label="Filter by breed" maxW="170px" value={breedFilter} onChange={changeFilter(setBreedFilter)}>
                <option value="">All breeds</option>
                {breeds.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
              <Select aria-label="Filter by status" maxW="150px" value={statusFilter} onChange={changeFilter(setStatusFilter)}>
                <option value="">All statuses</option>
                <option value="Active">Active</option>
                <option value="Sold">Sold</option>
                <option value="Deceased">Deceased</option>
              </Select>
              <Text fontSize="sm" color="fg.muted" ml="auto">
                {sorted.length} {sorted.length === 1 ? "animal" : "animals"}
              </Text>
            </HStack>

            {sorted.length === 0 ? (
              <EmptyState icon={FiSearch} title="No animals match" description="Try a different search or clear the filters." />
            ) : (
              <TableContainer>
                <Table>
                  <Thead>
                    <Tr>
                      <SortTh label="Tag" sortKey="tag" current={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Breed" sortKey="breed" current={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Sex" sortKey="sex" current={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Age" sortKey="date_of_birth" current={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortTh label="Status" sortKey="status" current={sortKey} dir={sortDir} onSort={toggleSort} />
                      <Th w="1%">
                        <span style={{ position: "absolute", left: "-9999px" }}>Actions</span>
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {visible.map((c) => (
                      <Tr
                        key={c.id}
                        cursor="pointer"
                        _hover={{ bg: "surface.muted" }}
                        onClick={() => navigate(`/cattle/${c.id}`)}
                      >
                        <Td fontWeight="600">{c.tag}</Td>
                        <Td>{c.breed}</Td>
                        <Td>{c.sex || "—"}</Td>
                        <Td>{formatAge(c.date_of_birth) || "—"}</Td>
                        <Td>
                          <Badge colorScheme={STATUS_COLORS[c.status] || "gray"}>{c.status}</Badge>
                        </Td>
                        <Td onClick={(e) => e.stopPropagation()}>
                          <Menu placement="bottom-end">
                            <MenuButton
                              as={IconButton}
                              aria-label={`Actions for ${c.tag}`}
                              icon={<FiMoreHorizontal />}
                              variant="ghost"
                              size="sm"
                            />
                            <MenuList>
                              <MenuItem icon={<FiEdit2 />} onClick={() => openEdit(c)}>
                                Edit
                              </MenuItem>
                              <MenuItem icon={<FiTrash2 />} color="red.500" onClick={() => remove(c)}>
                                Delete
                              </MenuItem>
                            </MenuList>
                          </Menu>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}

            {totalPages > 1 && (
              <HStack justify="space-between" p={4} borderTop="1px solid" borderColor="line">
                <Text fontSize="sm" color="fg.muted">
                  Page {currentPage} of {totalPages}
                </Text>
                <HStack>
                  <Button size="sm" variant="subtle" onClick={() => setPage(currentPage - 1)} isDisabled={currentPage === 1}>
                    Previous
                  </Button>
                  <Button size="sm" variant="subtle" onClick={() => setPage(currentPage + 1)} isDisabled={currentPage === totalPages}>
                    Next
                  </Button>
                </HStack>
              </HStack>
            )}
          </>
        )}
      </Card>

      <CattleFormModal isOpen={form.isOpen} onClose={form.onClose} animal={editing} onSaved={reload} />
    </PageTransition>
  );
}

function SortTh({ label, sortKey, current, dir, onSort }) {
  const active = current === sortKey;
  return (
    <Th
      cursor="pointer"
      userSelect="none"
      onClick={() => onSort(sortKey)}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <HStack spacing={1}>
        <Text as="span">{label}</Text>
        {active && <Icon as={dir === "asc" ? FiChevronUp : FiChevronDown} boxSize={3} />}
      </HStack>
    </Th>
  );
}
