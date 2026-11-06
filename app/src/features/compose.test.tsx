import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComposeTakeaway } from "./compose";
import { DemoServicesProvider } from "../app/services";
import { MemoryNetwork } from "../adapters/memory";
import { ALICE, SEED_USERS, seedNetwork } from "../adapters/memory/seed";

const now = new Date("2026-11-06T12:00:00Z");
function setup() {
  const net = new MemoryNetwork(SEED_USERS, () => now);
  seedNetwork(net, now);
  const session = net.all().find((r) => r.kind === "session" && r.value.title.startsWith("Attention"))!;
  const onPublished = vi.fn();
  render(
    <DemoServicesProvider network={net} initialUser={ALICE}>
      <ComposeTakeaway sessionUri={session.ref.uri} onPublished={onPublished} />
    </DemoServicesProvider>,
  );
  return { net, session, onPublished, user: userEvent.setup() };
}

describe("Publishing a takeaway", () => {
  it("publishes a takeaway with a link the student confirmed", async () => {
    const { net, onPublished, user } = setup();
    await user.type(screen.getByLabelText(/what did you learn/i), "Softmax saturates without scaling.");

    // Suggestions come from shared tags; the student picks one and says how it relates.
    const suggestion = (await screen.findAllByRole("group", { name: /suggested link/i }))[0];
    await user.click(within(suggestion).getByRole("checkbox"));
    await user.click(within(suggestion).getByRole("radio", { name: /broadens/i }));

    await user.click(screen.getByRole("button", { name: /preview/i }));
    expect(screen.getByText(/visible to anyone/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /publish publicly/i }));

    const mine = net.all().filter((r) => r.kind === "takeaway" && r.author === ALICE && r.value.text.startsWith("Softmax"));
    expect(mine).toHaveLength(1);
    expect("buildsOn" in mine[0].value && mine[0].value.buildsOn[0].relation).toBe("broadens");
    expect(onPublished).toHaveBeenCalledWith(mine[0].ref.uri);
  });

  it("publishes with no links when the student picks none", async () => {
    const { net, user } = setup();
    await user.type(screen.getByLabelText(/what did you learn/i), "Standalone idea.");
    await user.click(screen.getByRole("button", { name: /preview/i }));
    await user.click(screen.getByRole("button", { name: /publish publicly/i }));
    const mine = net.all().find((r) => r.kind === "takeaway" && r.value.text === "Standalone idea.")!;
    expect("buildsOn" in mine.value && mine.value.buildsOn).toEqual([]);
  });

  it("warns about personal data and requires an explicit override", async () => {
    const { net, user } = setup();
    await user.type(screen.getByLabelText(/what did you learn/i), "email me at alice@ucsd.edu");
    expect(screen.getByRole("alert")).toHaveTextContent(/email address/i);

    await user.click(screen.getByRole("button", { name: /preview/i }));
    const publish = screen.getByRole("button", { name: /publish publicly/i });
    expect(publish).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: /publish anyway/i }));
    expect(publish).toBeEnabled();
    expect(net.all().some((r) => r.kind === "takeaway" && r.value.text.includes("alice@ucsd.edu"))).toBe(false);
  });

  it("can't preview an empty takeaway", async () => {
    setup();
    expect(screen.getByRole("button", { name: /preview/i })).toBeDisabled();
  });
});
