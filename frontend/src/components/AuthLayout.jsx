import { Box, Flex, Heading, HStack, Icon, Link, Text, VStack } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { FiCheck } from "react-icons/fi";
import Logo from "./Logo";
import ColorModeToggle from "./ColorModeToggle";

const POINTS = [
  "Every animal, vaccination and weight in one register",
  "Reconcile your kraal count against the books in seconds",
  "Private by design — your herd data is yours alone",
];

/** Split layout shared by sign-in and sign-up: brand panel + focused form. */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <Flex minH="100vh" bg="app.bg">
      <Box
        display={{ base: "none", lg: "flex" }}
        flexDirection="column"
        justifyContent="space-between"
        w="44%"
        maxW="620px"
        p={12}
        color="white"
        bg="linear-gradient(160deg, #234A34 0%, #2F6244 55%, #3F7D57 100%)"
      >
        <Link as={RouterLink} to="/" _hover={{ textDecoration: "none" }} color="white">
          <Logo size={30} textProps={{ fontSize: "lg", color: "white" }} />
        </Link>

        <VStack align="start" spacing={6}>
          <Heading size="xl" lineHeight="1.15">
            Know your herd, down to every animal.
          </Heading>
          <VStack align="start" spacing={3}>
            {POINTS.map((p) => (
              <HStack key={p} align="flex-start" spacing={3}>
                <Icon as={FiCheck} mt={1} color="brand.200" />
                <Text color="whiteAlpha.900">{p}</Text>
              </HStack>
            ))}
          </VStack>
        </VStack>

        <Text fontSize="sm" color="whiteAlpha.700">
          Open-source portfolio project · React, Express, Postgres
        </Text>
      </Box>

      <Flex flex="1" direction="column" px={{ base: 5, md: 10 }} py={6}>
        <HStack justify={{ base: "space-between", lg: "flex-end" }}>
          <Link
            as={RouterLink}
            to="/"
            display={{ base: "block", lg: "none" }}
            _hover={{ textDecoration: "none" }}
          >
            <Logo size={24} textProps={{ fontSize: "md" }} />
          </Link>
          <ColorModeToggle />
        </HStack>

        <Flex flex="1" align="center" justify="center">
          <Box w="full" maxW="400px" py={8}>
            <Heading as="h1" size="lg" mb={2}>
              {title}
            </Heading>
            <Text color="fg.muted" mb={7}>
              {subtitle}
            </Text>
            {children}
            <Box mt={6}>{footer}</Box>
          </Box>
        </Flex>
      </Flex>
    </Flex>
  );
}
