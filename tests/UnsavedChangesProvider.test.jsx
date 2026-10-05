import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useCallback, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider, useNavigate } from "react-router-dom";
import { UnsavedChangesProvider } from "../src/components/layout/UnsavedChangesProvider";
import { useUnsavedChanges } from "../src/components/layout/useUnsavedChanges";

afterEach(cleanup);

function NavigationTest() {
  const { guardNavigation, setHasUnsavedChanges } = useUnsavedChanges();
  const [hasLeft, setHasLeft] = useState(false);
  const leave = useCallback(() => setHasLeft(true), []);
  return (
    <>
      <button type="button" onClick={() => setHasUnsavedChanges(true)}>Make edit</button>
      <button type="button" onClick={() => guardNavigation(leave)}>Leave screen</button>
      <output>{String(hasLeft)}</output>
    </>
  );
}

function RouterNavigationTest() {
  const { setHasUnsavedChanges } = useUnsavedChanges();
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => setHasUnsavedChanges(true)}>Make edit</button>
      <button type="button" onClick={() => navigate("/next")}>Navigate away</button>
      <p>Editing screen</p>
    </>
  );
}

describe("UnsavedChangesProvider", () => {
  it("asks before leaving and only discards after confirmation", () => {
    const router = createMemoryRouter([
      { path: "/", element: <UnsavedChangesProvider><NavigationTest /></UnsavedChangesProvider> },
    ]);
    render(<RouterProvider router={router} />);

    fireEvent.click(screen.getByRole("button", { name: "Make edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Leave screen" }));
    expect(screen.getByRole("dialog", { name: "Discard unsaved changes?" })).toBeInTheDocument();
    expect(screen.getByText("false")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("false")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Leave screen" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard Changes" }));
    expect(screen.getByText("true")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("blocks router navigation until the user cancels or discards", () => {
    const router = createMemoryRouter([
      {
        path: "/",
        element: <UnsavedChangesProvider><RouterNavigationTest /></UnsavedChangesProvider>,
      },
      { path: "/next", element: <p>Next screen</p> },
    ]);
    render(<RouterProvider router={router} />);

    fireEvent.click(screen.getByRole("button", { name: "Make edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Navigate away" }));
    expect(screen.getByRole("dialog", { name: "Discard unsaved changes?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Editing screen")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Navigate away" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard Changes" }));
    expect(screen.getByText("Next screen")).toBeInTheDocument();
  });
});
