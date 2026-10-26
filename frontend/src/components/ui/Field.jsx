import { FormControl, FormErrorMessage, FormHelperText, FormLabel } from "@chakra-ui/react";

/** Label + control + inline error/hint, wired for screen readers by Chakra. */
export default function Field({ label, error, hint, isRequired, children, ...props }) {
  return (
    <FormControl isInvalid={Boolean(error)} isRequired={isRequired} {...props}>
      {label && <FormLabel>{label}</FormLabel>}
      {children}
      {error ? (
        <FormErrorMessage>{error}</FormErrorMessage>
      ) : (
        hint && <FormHelperText color="fg.muted">{hint}</FormHelperText>
      )}
    </FormControl>
  );
}
