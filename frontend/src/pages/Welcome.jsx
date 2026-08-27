import { Box, Button, Stack, Text } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";

const MotionBox = motion(Box);

export default function Welcome() {
  const navigate = useNavigate();

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
        p={10}
        rounded="xl"
        border="1px solid"
        borderColor="whiteAlpha.100"
        bg="rgba(22,28,25,0.55)"
        backdropFilter="blur(20px) saturate(160%)"
        maxW="440px"
        w="full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <Stack spacing={6} textAlign="center" color="whiteAlpha.900">
          <Box alignSelf="center">
            <Logo size={30} markColor="#5E9C73" textProps={{ fontSize: "xl", color: "white" }} />
          </Box>

          <Text fontSize="sm" color="whiteAlpha.600">
            Herd records, vaccinations, and compliance — in one place.
          </Text>

          <Button
            size="lg"
            colorScheme="brand"
            onClick={() => navigate("/login")}
          >
            Sign in
          </Button>
        </Stack>
      </MotionBox>
    </Box>
  );
}
