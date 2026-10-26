import { useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Button,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Skeleton,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { FiEdit2, FiSearch, FiTrash2 } from "react-icons/fi";
import Card from "../components/Card";
import PageTransition from "../components/PageTransition";
import CattleFormModal from "../components/CattleFormModal";
import VaccinationHistory from "../components/VaccinationHistory";
import WeightHistory from "../components/WeightHistory";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import { api } from "../api";
import { useFetch } from "../hooks/useFetch";
import { useConfirm } from "../hooks/confirmContext";
import { useNotify } from "../hooks/useNotify";
import { formatAge } from "../utils/age";
import { formatDate } from "../utils/dates";
import { STATUS_COLORS } from "../utils/colors";

export default function CattleProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const notify = useNotify();
  const edit = useDisclosure();
  const [removing, setRemoving] = useState(false);

  const { data: animal, loading, error, reload } = useFetch(`/cattle/${id}`);
  const notFound = error?.response?.status === 404 || error?.response?.status === 400;

  const remove = async () => {
    const ok = await confirm({
      title: `Delete ${animal.tag}?`,
      body: "Its vaccination and weight history will be deleted too. This can't be undone.",
      confirmLabel: "Delete animal",
      danger: true,
    });
    if (!ok) return;
    setRemoving(true);
    try {
      await api.delete(`/cattle/${id}`);
      notify.success(`${animal.tag} deleted`);
      navigate("/register", { replace: true });
    } catch (err) {
      notify.error(err, "Couldn't delete the animal");
      setRemoving(false);
    }
  };

  if (notFound) {
    return (
      <PageTransition>
        <Card>
          <EmptyState
            icon={FiSearch}
            title="Animal not found"
            description="It may have been deleted, or the link is wrong."
            action={
              <Button as={RouterLink} to="/register" size="sm">
                Back to the register
              </Button>
            }
          />
        </Card>
      </PageTransition>
    );
  }

  if (error && !animal) {
    return (
      <PageTransition>
        <Card>
          <ErrorState error={error} onRetry={reload} title="Couldn't load this animal" />
        </Card>
      </PageTransition>
    );
  }

  const age = animal ? formatAge(animal.date_of_birth) : null;

  return (
    <PageTransition>
      <Breadcrumb mb={4} fontSize="sm" color="fg.muted">
        <BreadcrumbItem>
          <BreadcrumbLink as={RouterLink} to="/register">
            Register
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink href="#" aria-current="page" onClick={(e) => e.preventDefault()}>
            {animal?.tag ?? "…"}
          </BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      <Card>
        {loading || !animal ? (
          <Skeleton h="64px" borderRadius="lg" />
        ) : (
          <Flex justify="space-between" align={{ base: "stretch", md: "flex-start" }} gap={4} direction={{ base: "column", md: "row" }}>
            <Box>
              <HStack spacing={3} flexWrap="wrap">
                <Heading as="h1" size="lg">
                  {animal.tag}
                </Heading>
                <Badge colorScheme="brand">{animal.breed}</Badge>
                <Badge colorScheme={STATUS_COLORS[animal.status] || "gray"}>{animal.status}</Badge>
              </HStack>
              <SimpleGrid columns={{ base: 2, sm: 3 }} spacing={6} mt={4}>
                <Fact label="Sex" value={animal.sex} />
                <Fact label="Age" value={age ? `${age} old` : null} />
                <Fact label="Born" value={animal.date_of_birth ? formatDate(animal.date_of_birth) : null} />
              </SimpleGrid>
            </Box>
            <HStack spacing={2} alignSelf={{ base: "stretch", md: "flex-start" }}>
              <Button variant="subtle" leftIcon={<FiEdit2 />} onClick={edit.onOpen} flex={{ base: 1, md: "none" }}>
                Edit
              </Button>
              <Button variant="subtle" colorScheme="red" leftIcon={<FiTrash2 />} onClick={remove} isLoading={removing} flex={{ base: 1, md: "none" }}>
                Delete
              </Button>
            </HStack>
          </Flex>
        )}
      </Card>

      <Card mt={4} p={{ base: 4, md: 6 }}>
        <Tabs isLazy variant="line">
          <TabList>
            <Tab fontWeight="600">Vaccinations</Tab>
            <Tab fontWeight="600">Weight</Tab>
          </TabList>
          <TabPanels>
            <TabPanel px={0} pt={6}>
              <VaccinationHistory cattleId={id} />
            </TabPanel>
            <TabPanel px={0} pt={6}>
              <WeightHistory cattleId={id} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Card>

      <CattleFormModal isOpen={edit.isOpen} onClose={edit.onClose} animal={animal} onSaved={reload} />
    </PageTransition>
  );
}

function Fact({ label, value }) {
  return (
    <Box>
      <Text fontSize="xs" color="fg.muted" fontWeight="600" textTransform="uppercase" letterSpacing="0.04em">
        {label}
      </Text>
      <Text fontWeight="600">{value || "—"}</Text>
    </Box>
  );
}
