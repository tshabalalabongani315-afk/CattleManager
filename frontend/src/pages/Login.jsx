import { Box, Button, Heading, Stack, Text } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const MotionBox = motion(Box);

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (role) => {
    login(role);
    navigate("/dashboard", { replace: true });
  };

  return (
    <Box
      minH="100vh"
      background={
        "radial-gradient(1000px circle at 15% 0%, rgba(94,156,115,0.18), transparent 55%)," +
        "radial-gradient(800px circle at 100% 100%, rgba(94,124,138,0.12), transparent 50%), #0F1413"
      }
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
    >
      <MotionBox
        bg="rgba(22,28,25,0.55)"
        backdropFilter="blur(20px) saturate(160%)"
        border="1px solid"
        borderColor="whiteAlpha.100"
        p={8}
        rounded="xl"
        maxW="380px"
        w="full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Stack spacing={4} color="whiteAlpha.900">
          <Heading size="md" textAlign="center">
            Sign in
          </Heading>
          <Text fontSize="sm" color="whiteAlpha.600" textAlign="center" mb={2}>
            Choose your role to continue
          </Text>

          <Button colorScheme="brand" onClick={() => handleLogin("owner")}>
            Farm Owner
          </Button>

          <Button
            variant="outline"
            color="whiteAlpha.900"
            borderColor="whiteAlpha.300"
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={() => handleLogin("worker")}
          >
            Farm Worker
          </Button>
        </Stack>
      </MotionBox>
    </Box>
  );
}
