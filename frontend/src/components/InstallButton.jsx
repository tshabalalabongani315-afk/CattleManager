import {
  Button,
  HStack,
  Icon,
  ListItem,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  OrderedList,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { FiDownload } from "react-icons/fi";
import { useInstallPrompt } from "../hooks/useInstallPrompt";

/**
 * "Install app" entry for the sidebar. Chrome and Android get the real install
 * dialog; iPhone Safari has none, so it gets the Add to Home Screen steps.
 * Hidden once the app is installed or when the browser can't install it.
 */
export default function InstallButton() {
  const { canPrompt, isIos, isInstalled, install } = useInstallPrompt();
  const iosHelp = useDisclosure();

  if (isInstalled || (!canPrompt && !isIos)) return null;

  return (
    <>
      <HStack
        as="button"
        type="button"
        onClick={canPrompt ? install : iosHelp.onOpen}
        spacing={3}
        px={3}
        py={2}
        borderRadius="lg"
        color="fg.muted"
        _hover={{ bg: "surface.muted", color: "fg" }}
        transition="background 0.15s ease"
      >
        <Icon as={FiDownload} />
        <Text fontSize="sm" fontWeight="500">
          Install app
        </Text>
      </HStack>

      <Modal isOpen={iosHelp.isOpen} onClose={iosHelp.onClose} isCentered>
        <ModalOverlay />
        <ModalContent mx={4}>
          <ModalHeader>Install on your iPhone or iPad</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <OrderedList spacing={2} fontSize="sm">
              <ListItem>Open this page in Safari.</ListItem>
              <ListItem>Tap the Share button (the square with an arrow).</ListItem>
              <ListItem>Choose “Add to Home Screen”, then tap Add.</ListItem>
            </OrderedList>
            <Text mt={3} fontSize="sm" color="fg.muted">
              Cattle Manager then opens like any other app, and works without signal.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button onClick={iosHelp.onClose}>Got it</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
