import { useState } from "react";
import { IconButton, Input, InputGroup, InputRightElement } from "@chakra-ui/react";
import { FiEye, FiEyeOff } from "react-icons/fi";

/** Password field with a show/hide toggle (fewer typos, no layout shift). */
export default function PasswordInput(props) {
  const [show, setShow] = useState(false);

  return (
    <InputGroup>
      <Input type={show ? "text" : "password"} pr="2.75rem" {...props} />
      <InputRightElement>
        <IconButton
          size="sm"
          variant="ghost"
          aria-label={show ? "Hide password" : "Show password"}
          icon={show ? <FiEyeOff /> : <FiEye />}
          onClick={() => setShow((s) => !s)}
        />
      </InputRightElement>
    </InputGroup>
  );
}
