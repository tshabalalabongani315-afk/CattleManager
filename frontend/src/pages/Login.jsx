import { useState } from "react";
import { Alert, AlertDescription, AlertIcon, Button, Divider, HStack, Input, Link, Stack, Text } from "@chakra-ui/react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import Field from "../components/ui/Field";
import PasswordInput from "../components/ui/PasswordInput";
import { useAuth } from "../context/AuthContext";
import { useDemo } from "../hooks/useDemo";
import { errorMessage } from "../api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const demo = useDemo();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate(location.state?.from ?? "/dashboard", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Sign in failed. Please try again."));
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to see your herd."
      footer={
        <Text fontSize="sm" color="fg.muted" textAlign="center">
          New here?{" "}
          <Link as={RouterLink} to="/signup" color="brand.fg" fontWeight="600">
            Create an account
          </Link>
        </Text>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <Stack spacing={4}>
          {error && (
            <Alert status="error" borderRadius="lg" role="alert">
              <AlertIcon />
              <AlertDescription fontSize="sm">{error}</AlertDescription>
            </Alert>
          )}

          <Field label="Username" isRequired>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoFocus
            />
          </Field>
          <Field label="Password" isRequired>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>

          <Button type="submit" size="lg" isLoading={loading} isDisabled={!username || !password}>
            Sign in
          </Button>

          <HStack>
            <Divider />
            <Text fontSize="xs" color="fg.muted" flexShrink={0}>
              or
            </Text>
            <Divider />
          </HStack>

          <Button variant="subtle" size="lg" onClick={demo.startDemo} isLoading={demo.loading}>
            Try the live demo
          </Button>
        </Stack>
      </form>
    </AuthLayout>
  );
}
