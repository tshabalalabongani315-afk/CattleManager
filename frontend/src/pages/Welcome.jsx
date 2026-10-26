import { useEffect } from "react";
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Grid,
  Heading,
  HStack,
  Icon,
  Link,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import {
  FiActivity,
  FiBarChart2,
  FiClipboard,
  FiDownload,
  FiGithub,
  FiLock,
  FiPieChart,
  FiRepeat,
  FiShield,
  FiTrendingUp,
  FiUserCheck,
} from "react-icons/fi";
import Logo from "../components/Logo";
import ColorModeToggle from "../components/ColorModeToggle";
import { useAuth } from "../context/AuthContext";
import { useDemo } from "../hooks/useDemo";

const REPO_URL = "https://github.com/tshabalalabongani315-afk/CattleManager";

const FEATURES = [
  { icon: FiClipboard, title: "A register that stays accurate", text: "Tag, breed, sex, date of birth and status for every animal — searchable, sortable and exportable." },
  { icon: FiActivity, title: "Vaccinations that don't slip", text: "Log doses with next-due dates and see what's overdue or due soon the moment you sign in." },
  { icon: FiTrendingUp, title: "Weight and growth", text: "Weigh-ins per animal with a growth chart and average daily gain, so you spot poor doers early." },
  { icon: FiBarChart2, title: "Daily kraal counts", text: "Record the count each day and reconcile it against the register to catch anything unaccounted for." },
  { icon: FiRepeat, title: "Every movement on record", text: "Animals in, out, sold or died — with notes — and a monthly summary on your dashboard." },
  { icon: FiPieChart, title: "Reports you can take with you", text: "Breed and status breakdowns, plus CSV and full-data exports whenever you want them." },
];

const SECURITY = [
  { icon: FiLock, title: "No tokens in the browser", text: "Sessions live in httpOnly, SameSite=Strict cookies that scripts can't read." },
  { icon: FiUserCheck, title: "Your data is yours alone", text: "Every query is scoped to the signed-in owner, with an automated cross-account test suite." },
  { icon: FiShield, title: "Validated and rate-limited", text: "Strict input validation, brute-force protection, and hardened security headers." },
  { icon: FiDownload, title: "Export or delete anytime", text: "Download everything as JSON, or delete your account and all of its data in one step." },
];

const STACK = ["React", "Vite", "Chakra UI", "Express", "PostgreSQL", "Vercel"];

export default function Welcome() {
  const { status } = useAuth();
  const demo = useDemo();
  const authed = status === "authed";

  useEffect(() => {
    document.title = "Cattle Manager — herd records, vaccinations and counts";
  }, []);

  return (
    <Box bg="app.bg" minH="100vh">
      <a className="skip-link" href="#content">
        Skip to content
      </a>

      <Box as="header" position="sticky" top={0} zIndex={20} bg="surface" borderBottom="1px solid" borderColor="line">
        <Container maxW="1120px">
          <Flex h="64px" align="center" justify="space-between">
            <Logo size={26} textProps={{ fontSize: "md" }} />
            <HStack spacing={{ base: 1, md: 3 }}>
              <Link href="#features" display={{ base: "none", md: "inline" }} px={3} color="fg.muted" fontWeight="500">
                Features
              </Link>
              <Link href="#security" display={{ base: "none", md: "inline" }} px={3} color="fg.muted" fontWeight="500">
                Security
              </Link>
              <ColorModeToggle />
              {authed ? (
                <Button as={RouterLink} to="/dashboard" size="sm">
                  Open dashboard
                </Button>
              ) : (
                <>
                  <Button as={RouterLink} to="/login" size="sm" variant="ghost">
                    Sign in
                  </Button>
                  <Button as={RouterLink} to="/signup" size="sm" display={{ base: "none", sm: "inline-flex" }}>
                    Get started
                  </Button>
                </>
              )}
            </HStack>
          </Flex>
        </Container>
      </Box>

      <main id="content">
        {/* Hero */}
        <Box
          bg="linear-gradient(180deg, rgba(63,125,87,0.10) 0%, rgba(63,125,87,0) 100%)"
          pt={{ base: 12, md: 20 }}
          pb={{ base: 10, md: 16 }}
        >
          <Container maxW="1120px">
            <VStack spacing={6} textAlign="center" maxW="760px" mx="auto">
              <Badge colorScheme="brand" px={3} py={1} fontSize="xs">
                Open-source portfolio project
              </Badge>
              <Heading as="h1" fontSize={{ base: "4xl", md: "6xl" }} lineHeight="1.05" letterSpacing="-0.03em">
                Herd records that keep up with your farm.
              </Heading>
              <Text fontSize={{ base: "md", md: "lg" }} color="fg.muted" maxW="60ch">
                Registers, vaccinations, weights, daily counts and movements — in one calm, secure place built for
                commercial cattle owners.
              </Text>
              <HStack spacing={3} flexWrap="wrap" justify="center">
                {authed ? (
                  <Button as={RouterLink} to="/dashboard" size="lg" px={8}>
                    Open your dashboard
                  </Button>
                ) : (
                  <>
                    <Button size="lg" px={8} onClick={demo.startDemo} isLoading={demo.loading}>
                      Try the live demo
                    </Button>
                    <Button as={RouterLink} to="/signup" size="lg" variant="subtle" px={8}>
                      Create an account
                    </Button>
                  </>
                )}
              </HStack>
              {!authed && (
                <Text fontSize="sm" color="fg.muted">
                  No sign-up needed for the demo · sample data · private to you
                </Text>
              )}
            </VStack>

            <ProductPreview />
          </Container>
        </Box>

        {/* Features */}
        <Container maxW="1120px" id="features" py={{ base: 12, md: 20 }}>
          <SectionHeading eyebrow="Features" title="Everything the herd needs, nothing it doesn't" />
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={5} mt={10}>
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </SimpleGrid>
        </Container>

        {/* Security */}
        <Box id="security" bg="surface" borderY="1px solid" borderColor="line" py={{ base: 12, md: 20 }}>
          <Container maxW="1120px">
            <SectionHeading
              eyebrow="Security"
              title="Built so your records stay yours"
              text="Farm data is business-critical. This app treats it that way."
            />
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mt={10}>
              {SECURITY.map((s) => (
                <HStack key={s.title} align="flex-start" spacing={4}>
                  <IconBadge icon={s.icon} />
                  <Box>
                    <Heading as="h3" size="sm" mb={1}>
                      {s.title}
                    </Heading>
                    <Text color="fg.muted" fontSize="sm">
                      {s.text}
                    </Text>
                  </Box>
                </HStack>
              ))}
            </SimpleGrid>
          </Container>
        </Box>

        {/* Stack + CTA */}
        <Container maxW="1120px" py={{ base: 12, md: 20 }}>
          <VStack spacing={8} textAlign="center">
            <Text fontSize="sm" color="fg.muted" fontWeight="600" letterSpacing="0.06em" textTransform="uppercase">
              Built with
            </Text>
            <HStack spacing={2} flexWrap="wrap" justify="center">
              {STACK.map((s) => (
                <Badge key={s} px={3} py={1} fontSize="sm" variant="outline" colorScheme="gray">
                  {s}
                </Badge>
              ))}
            </HStack>

            {!authed && (
              <Box
                w="full"
                mt={6}
                p={{ base: 8, md: 12 }}
                borderRadius="2xl"
                color="white"
                bg="linear-gradient(135deg, #234A34 0%, #3F7D57 100%)"
              >
                <Heading size="lg" mb={3}>
                  See it with a full herd in 10 seconds.
                </Heading>
                <Text color="whiteAlpha.900" mb={6}>
                  The demo is a private sandbox with realistic sample data. Nothing to install, nothing to remember.
                </Text>
                <Button
                  size="lg"
                  bg="white"
                  color="brand.700"
                  _hover={{ bg: "brand.50" }}
                  onClick={demo.startDemo}
                  isLoading={demo.loading}
                >
                  Launch the demo
                </Button>
              </Box>
            )}
          </VStack>
        </Container>
      </main>

      <Box as="footer" borderTop="1px solid" borderColor="line" py={8}>
        <Container maxW="1120px">
          <Flex justify="space-between" align="center" gap={4} direction={{ base: "column", sm: "row" }}>
            <Text fontSize="sm" color="fg.muted">
              © {new Date().getFullYear()} Cattle Manager · A portfolio project
            </Text>
            <Link href={REPO_URL} isExternal fontSize="sm" color="fg.muted" _hover={{ color: "fg" }}>
              <HStack spacing={2}>
                <Icon as={FiGithub} />
                <Text>View the source on GitHub</Text>
              </HStack>
            </Link>
          </Flex>
        </Container>
      </Box>
    </Box>
  );
}

function SectionHeading({ eyebrow, title, text }) {
  return (
    <VStack spacing={3} textAlign="center" maxW="640px" mx="auto">
      <Text fontSize="sm" fontWeight="700" letterSpacing="0.06em" textTransform="uppercase" color="brand.fg">
        {eyebrow}
      </Text>
      <Heading as="h2" size="xl">
        {title}
      </Heading>
      {text && <Text color="fg.muted">{text}</Text>}
    </VStack>
  );
}

function IconBadge({ icon }) {
  return (
    <Box
      display="grid"
      placeItems="center"
      w={10}
      h={10}
      flexShrink={0}
      borderRadius="lg"
      bg="brand.50"
      color="brand.600"
      _dark={{ bg: "whiteAlpha.100", color: "brand.300" }}
    >
      <Icon as={icon} boxSize={5} />
    </Box>
  );
}

function FeatureCard({ icon, title, text }) {
  return (
    <Box bg="surface" border="1px solid" borderColor="line" borderRadius="xl" p={6}>
      <IconBadge icon={icon} />
      <Heading as="h3" size="sm" mt={4} mb={2}>
        {title}
      </Heading>
      <Text color="fg.muted" fontSize="sm">
        {text}
      </Text>
    </Box>
  );
}

/** A decorative, code-drawn preview of the dashboard (no screenshots to go stale). */
function ProductPreview() {
  const bars = [46, 58, 52, 70, 64, 82, 76, 90, 84, 96];

  return (
    <Box
      aria-hidden="true"
      mt={{ base: 12, md: 16 }}
      mx="auto"
      maxW="940px"
      bg="surface"
      border="1px solid"
      borderColor="line"
      borderRadius="2xl"
      boxShadow="0 24px 60px -24px rgba(20, 40, 28, 0.35)"
      overflow="hidden"
    >
      <HStack px={4} py={3} spacing={2} borderBottom="1px solid" borderColor="line" bg="surface.muted">
        {["#F26B5E", "#F5BD4F", "#62C554"].map((c) => (
          <Box key={c} w="10px" h="10px" borderRadius="full" bg={c} />
        ))}
        <Text fontSize="xs" color="fg.muted" ml={3}>
          Dashboard
        </Text>
      </HStack>

      <Box p={{ base: 4, md: 6 }}>
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
          {[
            ["Active animals", "118"],
            ["Kraal count", "118"],
            ["Need attention", "4"],
            ["Moved this month", "+7"],
          ].map(([label, value]) => (
            <Box key={label} border="1px solid" borderColor="line" borderRadius="lg" p={3}>
              <Text fontSize="xs" color="fg.muted">
                {label}
              </Text>
              <Text fontSize="2xl" fontWeight="700" letterSpacing="-0.02em">
                {value}
              </Text>
            </Box>
          ))}
        </SimpleGrid>

        <Grid templateColumns={{ base: "1fr", md: "1.4fr 1fr" }} gap={3} mt={3}>
          <Box border="1px solid" borderColor="line" borderRadius="lg" p={4}>
            <Text fontSize="xs" color="fg.muted" mb={3}>
              Average weight, last 10 weigh-ins
            </Text>
            <HStack align="flex-end" spacing={2} h="110px">
              {bars.map((h, i) => (
                <Box key={i} flex="1" h={`${h}%`} bg="brand.400" borderRadius="sm" opacity={0.55 + i * 0.045} />
              ))}
            </HStack>
          </Box>
          <VStack align="stretch" border="1px solid" borderColor="line" borderRadius="lg" p={4} spacing={3}>
            <Text fontSize="xs" color="fg.muted">
              Vaccinations due
            </Text>
            {[
              ["ZA-104", "Anthrax", "Overdue", "red"],
              ["ZA-117", "Brucellosis", "Due soon", "orange"],
              ["ZA-121", "Lumpy Skin", "Due soon", "orange"],
            ].map(([tag, vaccine, label, color]) => (
              <HStack key={tag} justify="space-between">
                <Box>
                  <Text fontSize="sm" fontWeight="600">
                    {tag}
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    {vaccine}
                  </Text>
                </Box>
                <Badge colorScheme={color}>{label}</Badge>
              </HStack>
            ))}
          </VStack>
        </Grid>
      </Box>
    </Box>
  );
}
