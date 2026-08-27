import { useState } from "react";
import { Box, Button, Heading, Input, Stack, Text, Link } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";

const MotionBox = motion(Box);

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;

    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { username, password });
      login(res.data.token, res.data.user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
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
        as="form"
        onSubmit={handleSubmit}
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

          <Input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            borderColor="whiteAlpha.300"
            autoFocus
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            borderColor="whiteAlpha.300"
          />

          {error && (
            <Text fontSize="sm" color="red.300">
              {error}
            </Text>
          )}

          <Button type="submit" colorScheme="brand" isLoading={loading}>
            Sign in
          </Button>

          <Text fontSize="sm" color="whiteAlpha.600" textAlign="center">
            Don&apos;t have an account?{" "}
            <Link as={RouterLink} to="/signup" color="brand.400">
              Sign up
            </Link>
          </Text>
        </Stack>
      </MotionBox>
    </Box>
  );
}
