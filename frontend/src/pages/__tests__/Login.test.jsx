import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChakraProvider } from "@chakra-ui/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Login from "../Login";
import theme from "../../theme";

// A plain function (not vi.fn) so rejected promises are handled only by the component.
const auth = vi.hoisted(() => {
  const state = { calls: [], impl: async () => ({}) };
  return {
    state,
    login: (...args) => {
      state.calls.push(args);
      return state.impl(...args);
    },
  };
});

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ login: auth.login, startDemo: () => {} }),
}));

function renderLogin() {
  return render(
    <ChakraProvider theme={theme}>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<p>Dashboard page</p>} />
        </Routes>
      </MemoryRouter>
    </ChakraProvider>
  );
}

const fillAndSubmit = async (username, password) => {
  await userEvent.type(screen.getByLabelText(/username/i), username);
  await userEvent.type(screen.getByLabelText(/^password/i), password);
  await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
};

describe("Login", () => {
  beforeEach(() => {
    auth.state.calls = [];
    auth.state.impl = async () => ({});
  });

  it("keeps the button disabled until both fields are filled", async () => {
    renderLogin();
    const button = screen.getByRole("button", { name: /^sign in$/i });
    expect(button).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/username/i), "alice");
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/^password/i), "correct-horse-battery");
    expect(button).toBeEnabled();
  });

  it("signs in and goes to the dashboard", async () => {
    renderLogin();
    await fillAndSubmit("alice", "correct-horse-battery");

    expect(auth.state.calls).toEqual([["alice", "correct-horse-battery"]]);
    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
  });

  it("shows the server's error message when sign-in fails", async () => {
    auth.state.impl = async () => {
      throw Object.assign(new Error("Request failed"), {
        response: { status: 401, data: { error: "Invalid username or password" } },
      });
    };
    renderLogin();
    await fillAndSubmit("alice", "wrong-password-1");

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid username or password");
    await waitFor(() => expect(screen.queryByText("Dashboard page")).not.toBeInTheDocument());
  });

  it("lets the user reveal the password", async () => {
    renderLogin();
    const field = screen.getByLabelText(/^password/i);
    expect(field).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: /show password/i }));
    expect(field).toHaveAttribute("type", "text");
  });
});
