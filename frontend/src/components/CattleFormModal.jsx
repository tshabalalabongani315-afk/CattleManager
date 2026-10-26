import { useState } from "react";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Stack,
} from "@chakra-ui/react";
import Field from "./ui/Field";
import { api, errorMessage } from "../api";
import { useNotify } from "../hooks/useNotify";
import { todayISO } from "../utils/dates";

const STATUSES = ["Active", "Sold", "Deceased"];

/** Add or edit one animal. Pass `animal` to edit; omit it to create. */
export default function CattleFormModal({ isOpen, onClose, animal, onSaved }) {
  // Remount the form each time it opens so fields always start from the right values.
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay />
      {isOpen && <FormContent key={animal?.id ?? "new"} animal={animal} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  );
}

function FormContent({ animal, onClose, onSaved }) {
  const notify = useNotify();
  const editing = Boolean(animal);

  const [values, setValues] = useState({
    tag: animal?.tag ?? "",
    breed: animal?.breed ?? "",
    sex: animal?.sex ?? "",
    date_of_birth: animal?.date_of_birth ?? "",
    status: animal?.status ?? "Active",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Typing in a field clears that field's error so stale messages don't linger.
  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const validate = () => {
    const next = {};
    if (!values.tag.trim()) next.tag = "Enter the tag number";
    if (!values.breed.trim()) next.breed = "Enter the breed";
    if (values.date_of_birth && values.date_of_birth > todayISO()) {
      next.date_of_birth = "Date of birth can't be in the future";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        tag: values.tag.trim(),
        breed: values.breed.trim(),
        sex: values.sex || null,
        date_of_birth: values.date_of_birth || null,
        status: values.status,
      };
      const res = editing
        ? await api.put(`/cattle/${animal.id}`, payload)
        : await api.post("/cattle", payload);
      notify.success(editing ? "Animal updated" : `${res.data.tag} added to the register`);
      onSaved?.(res.data);
      onClose();
    } catch (err) {
      // A duplicate tag is the likeliest server-side rejection; show it on the field.
      if (err.response?.status === 409) setErrors({ tag: "You already have an animal with this tag" });
      else notify.error(errorMessage(err, "Couldn't save the animal"));
      setSaving(false);
    }
  };

  return (
    <ModalContent as="form" onSubmit={submit} noValidate mx={4}>
      <ModalHeader>{editing ? `Edit ${animal.tag}` : "Add an animal"}</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <Stack spacing={4}>
          <SimpleGrid columns={2} spacing={3}>
            <Field label="Tag number" isRequired error={errors.tag}>
              <Input value={values.tag} onChange={set("tag")} maxLength={32} autoFocus />
            </Field>
            <Field label="Breed" isRequired error={errors.breed}>
              <Input value={values.breed} onChange={set("breed")} maxLength={64} />
            </Field>
          </SimpleGrid>
          <SimpleGrid columns={2} spacing={3}>
            <Field label="Sex">
              <Select value={values.sex} onChange={set("sex")} placeholder="Not set">
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </Select>
            </Field>
            <Field label="Date of birth" error={errors.date_of_birth}>
              <Input type="date" value={values.date_of_birth} onChange={set("date_of_birth")} max={todayISO()} />
            </Field>
          </SimpleGrid>
          <Field label="Status">
            <Select value={values.status} onChange={set("status")}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        </Stack>
      </ModalBody>
      <ModalFooter gap={2}>
        <Button variant="subtle" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" isLoading={saving}>
          {editing ? "Save changes" : "Add animal"}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
