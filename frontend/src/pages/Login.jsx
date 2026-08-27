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
      bg="ink.900"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
    >
      <MotionBox
        bg="ink.800"
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
