import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Heading,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Switch,
  Text,
  useColorMode,
  useDisclosure,
} from "@chakra-ui/react";
import { FiDownload, FiTrash2 } from "react-icons/fi";
import Card from "../components/Card";
import PageTransition from "../components/PageTransition";
import PageHeader from "../components/ui/PageHeader";
import Field from "../components/ui/Field";
import PasswordInput from "../components/ui/PasswordInput";
import { api, errorMessage } from "../api";
import { useAuth } from "../context/AuthContext";
import { useNotify } from "../hooks/useNotify";
import { downloadBlob } from "../utils/csv";

export default function Settings() {
  const { user } = useAuth();
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <PageTransition>
      <PageHeader title="Settings" description="Appearance, your account, and your data." />

      <Stack spacing={4} maxW="680px">
        <Card>
          <Heading as="h2" size="sm" mb={4}>
            Appearance
          </Heading>
          <HStack justify="space-between">
            <Box>
              <Text fontWeight="600">Dark mode</Text>
              <Text fontSize="sm" color="fg.muted">
                Easier on the eyes in low light.
              </Text>
            </Box>
            <Switch isChecked={colorMode === "dark"} onChange={toggleColorMode} aria-label="Dark mode" />
          </HStack>
        </Card>

        {user?.isDemo ? (
          <Alert status="info" borderRadius="xl" alignItems="flex-start">
            <AlertIcon mt={1} />
            <AlertDescription fontSize="sm">
              You&apos;re in a temporary demo sandbox, so password changes, exports and account deletion are switched off.
              Create a real account to use them.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <ChangePassword />
            <YourData username={user?.username} />
          </>
        )}
      </Stack>
    </PageTransition>
  );
}

function ChangePassword() {
  const notify = useNotify();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!current) found.current = "Enter your current password";
    if (next.length < 10) found.next = "Use at least 10 characters";
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      await api.post("/account/password", { currentPassword: current, newPassword: next });
      notify.success("Password changed", "Your other devices have been signed out.");
      setCurrent("");
      setNext("");
    } catch (err) {
      const message = errorMessage(err, "Couldn't change the password");
      if (err.response?.status === 403) setErrors({ current: message });
      else notify.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card as="form" onSubmit={submit} noValidate>
      <Heading as="h2" size="sm" mb={1}>
        Password
      </Heading>
      <Text fontSize="sm" color="fg.muted" mb={4}>
        Changing it signs out every other device.
      </Text>
      <Stack spacing={4} maxW="380px">
        <Field label="Current password" error={errors.current}>
          <PasswordInput value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        </Field>
        <Field label="New password" error={errors.next} hint="At least 10 characters.">
          <PasswordInput value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        </Field>
        <Button type="submit" alignSelf="flex-start" isLoading={saving}>
          Update password
        </Button>
      </Stack>
    </Card>
  );
}

function YourData({ username }) {
  const notify = useNotify();
  const navigate = useNavigate();
  const { clear } = useAuth();
  const dialog = useDisclosure();
  const [exporting, setExporting] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const exportData = async () => {
    setExporting(true);
    try {
      const res = await api.get("/account/export", { responseType: "blob" });
      downloadBlob("cattle-manager-export.json", res.data);
      notify.success("Export downloaded");
    } catch (err) {
      notify.error(err, "Couldn't export your data");
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async (e) => {
    e.preventDefault();
    if (!password) return setError("Enter your password to confirm");
    setDeleting(true);
    setError("");
    try {
      await api.delete("/account", { data: { password } });
      clear();
      navigate("/", { replace: true });
      notify.info("Your account and all of its data have been deleted");
    } catch (err) {
      setError(errorMessage(err, "Couldn't delete the account"));
      setDeleting(false);
    }
  };

  return (
    <>
      <Card>
        <Heading as="h2" size="sm" mb={1}>
          Your data
        </Heading>
        <Text fontSize="sm" color="fg.muted" mb={4}>
          Your records belong to you. Download everything as a JSON file, or delete the account and all of its data.
        </Text>
        <HStack spacing={3} flexWrap="wrap">
          <Button variant="subtle" leftIcon={<FiDownload />} onClick={exportData} isLoading={exporting}>
            Export my data
          </Button>
          <Button variant="subtle" colorScheme="red" leftIcon={<FiTrash2 />} onClick={dialog.onOpen}>
            Delete account
          </Button>
        </HStack>
      </Card>

      <Modal isOpen={dialog.isOpen} onClose={dialog.onClose} isCentered>
        <ModalOverlay />
        <ModalContent as="form" onSubmit={deleteAccount} noValidate mx={4}>
          <ModalHeader>Delete {username}?</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <Text color="fg.muted">
                This permanently deletes your account, register, vaccinations, weights, counts and movements. It can&apos;t be
                undone.
              </Text>
              <Field label="Confirm with your password" error={error}>
                <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoFocus />
              </Field>
            </Stack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="subtle" onClick={dialog.onClose}>
              Cancel
            </Button>
            <Button type="submit" colorScheme="red" isLoading={deleting}>
              Delete everything
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
