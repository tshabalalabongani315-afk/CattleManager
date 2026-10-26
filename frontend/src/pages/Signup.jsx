import { useState } from "react";
import { Alert, AlertDescription, AlertIcon, Button, HStack, Icon, Input, Link, Stack, Text } from "@chakra-ui/react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { FiCheckCircle, FiCircle } from "react-icons/fi";
import AuthLayout from "../components/AuthLayout";
import Field from "../components/ui/Field";
import PasswordInput from "../components/ui/PasswordInput";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../api";

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const usernameOk = USERNAME_RE.test(username.trim());
  const lengthOk = password.length >= 10;
  const matches = password.length > 0 && password === confirm;
  const canSubmit = usernameOk && lengthOk && matches;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError("");
    setLoading(true);
    try {
      await signup(username, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Sign up failed. Please try again."));
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Free. Your herd data stays private to you."
      footer={
        <Text fontSize="sm" color="fg.muted" textAlign="center">
          Already registered?{" "}
          <Link as={RouterLink} to="/login" color="brand.fg" fontWeight="600">
            Sign in
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

          <Field
            label="Username"
            isRequired
            hint="3–32 characters: letters, numbers, dot, dash or underscore."
            error={username && !usernameOk ? "That username isn't valid yet." : ""}
          >
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
              autoComplete="new-password"
            />
          </Field>

          <Field label="Confirm password" isRequired>
            <PasswordInput
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </Field>

          <Stack spacing={1} aria-live="polite">
            <Requirement met={lengthOk}>At least 10 characters</Requirement>
            <Requirement met={matches}>Passwords match</Requirement>
          </Stack>

          <Button type="submit" size="lg" isLoading={loading} isDisabled={!canSubmit}>
            Create account
          </Button>
        </Stack>
      </form>
    </AuthLayout>
  );
}

function Requirement({ met, children }) {
  return (
    <HStack spacing={2} color={met ? "green.500" : "fg.muted"} fontSize="sm">
      <Icon as={met ? FiCheckCircle : FiCircle} />
      <Text>{children}</Text>
    </HStack>
  );
}
