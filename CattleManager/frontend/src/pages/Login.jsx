import {
  Box,
  Button,
  Heading,
  Stack,
  useColorModeValue,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const MotionBox = motion(Box);

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const bg = useColorModeValue("white", "gray.800");

const handleLogin = (role) => {
  login(role);
  navigate("/dashboard", { replace: true });
};


  return (
    <Box
      minH="100vh"
      bgGradient="linear(to-br, green.400, teal.500)"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <MotionBox
        bg={bg}
        p={8}
        rounded="2xl"
        shadow="2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Stack spacing={4}>
          <Heading size="lg" textAlign="center">
            Welcome Back
          </Heading>

          <Button colorScheme="green" onClick={() => handleLogin("owner")}>
            Farm Owner
          </Button>

          <Button variant="outline" onClick={() => handleLogin("worker")}>
            Farm Worker
          </Button>
        </Stack>
      </MotionBox>
    </Box>
  );
}
