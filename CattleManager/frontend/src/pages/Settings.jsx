import {
  Box,
  Heading,
  Input,
  Switch,
  HStack,
  VStack,
  Text,
  Select,
  Button,
  Divider,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useColorMode } from "@chakra-ui/react";


export default function Settings() {
  const [settings, setSettings] = useState({
    farmName: "",
    ownerName: "",
    minStockAlert: 20,
    enableNotifications: true,
    theme: "light",
    autoBackup: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem("farmSettings");
    if (saved) setSettings(JSON.parse(saved));
  }, []);

  const save = () => {
    localStorage.setItem("farmSettings", JSON.stringify(settings));
    alert("Settings saved");
  };

  const { colorMode, toggleColorMode } = useColorMode();

  return (

    <Box bg="white" _dark={{ bg: "gray.800" }} p={6} rounded="xl" shadow="md" maxW="1000px">
      <Heading size="md" mb={6}>
        Application Settings
      </Heading>

      <VStack spacing={6} align="stretch">
        {/* Farm Info */}
        <Section title="Farm Information">
          <Input
            placeholder="Farm Name"
            value={settings.farmName}
            onChange={e =>
              setSettings({ ...settings, farmName: e.target.value })
            }
          />
          <Input
            placeholder="Owner Name"
            value={settings.ownerName}
            onChange={e =>
              setSettings({ ...settings, ownerName: e.target.value })
            }
          />
        </Section>

        <Divider />

        {/* Herd Rules */}
        <Section title="Herd Rules">
          <HStack justify="space-between">
            <Text>Minimum Stock Alert</Text>
            <Input
              type="number"
              w="120px"
              value={settings.minStockAlert}
              onChange={e =>
                setSettings({ ...settings, minStockAlert: e.target.value })
              }
            />
          </HStack>
        </Section>

        <Divider />

        {/* Notifications */}
        <Section title="Notifications">
          <HStack justify="space-between">
            <Text>Enable Notifications</Text>
            <Switch
              colorScheme="green"
              isChecked={settings.enableNotifications}
              onChange={e =>
                setSettings({
                  ...settings,
                  enableNotifications: e.target.checked,
                })
              }
            />
          </HStack>

          <HStack justify="space-between">
            <Text>Automatic Backup</Text>
            <Switch
              colorScheme="green"
              isChecked={settings.autoBackup}
              onChange={e =>
                setSettings({
                  ...settings,
                  autoBackup: e.target.checked,
                })
              }
            />
          </HStack>
        </Section>

        <Divider />

        {/* UI Preferences */}
        <Section title="UI Preferences">
  <HStack justify="space-between">
    <Text>Dark Mode</Text>
    <Switch
      isChecked={colorMode === "dark"}
      onChange={toggleColorMode}
      colorScheme="green"
    />
  </HStack>
</Section>


        <Button
          colorScheme="green"
          alignSelf="flex-end"
          onClick={save}
        >
          Save Settings
        </Button>
      </VStack>
    </Box>
  );
}

function Section({ title, children }) {
  return (
    <VStack align="stretch" spacing={3}>
      <Text fontWeight="bold">{title}</Text>
      {children}
    </VStack>
  );
}
