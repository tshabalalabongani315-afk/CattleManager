import {
  Box,
  Button,
  Heading,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const MotionBox = motion(Box);

export default function Welcome() {
  const navigate = useNavigate();
  const cardBg = useColorModeValue(
    "rgba(255,255,255,0.85)",
    "rgba(26,32,44,0.85)"
  );

  return (
    <Box
      minH="100vh"
      bgGradient="linear(to-br, green.400, green.600, teal.600)"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <MotionBox
        p={10}
        rounded="2xl"
        shadow="2xl"
        bg={cardBg}
        backdropFilter="blur(14px)"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <Stack spacing={6} textAlign="center">
          <Heading size="xl">🐄 Cattle Manager</Heading>

          <Text fontSize="md" color="gray.600">
            Intelligent herd management for modern farms
          </Text>

          <Button
            size="lg"
            colorScheme="green"
            onClick={() => navigate("/login")}
            _hover={{ transform: "translateY(-2px)" }}
            transition="all 0.2s"
          >
            Get Started
          </Button>
        </Stack>
      </MotionBox>
    </Box>
  );
}
