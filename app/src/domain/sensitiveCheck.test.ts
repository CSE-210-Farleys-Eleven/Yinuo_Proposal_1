import { checkSensitive } from "./sensitiveCheck";

// Fake keys are built at runtime so secret scanners don't flag this file.
const fakeAnthropicKey = "sk-ant-" + "a1B2".repeat(8);
const fakeGithubToken = "ghp_" + "Z9".repeat(18);
const fakeAwsKey = "AKIA" + "ABCDEFGH12345678";

describe("checkSensitive", () => {
  it("finds nothing in ordinary study text", () => {
    expect(checkSensitive("Attention scales by sqrt(d) to keep softmax gradients stable.")).toEqual([]);
  });

  it("flags an email address", () => {
    expect(checkSensitive("ping me at alice@ucsd.edu")).toEqual([{ kind: "email", match: "alice@ucsd.edu" }]);
  });

  it("flags a phone number", () => {
    expect(checkSensitive("call 858-555-0123 later")[0]).toEqual({ kind: "phone", match: "858-555-0123" });
  });

  it("flags a student ID like A12345678", () => {
    expect(checkSensitive("my PID is A12345678")[0]).toEqual({ kind: "studentId", match: "A12345678" });
  });

  it("flags API keys and tokens pasted with code", () => {
    const kinds = checkSensitive(`client = Anthropic(api_key="${fakeAnthropicKey}") ${fakeGithubToken} ${fakeAwsKey}`)
      .map((f) => f.kind);
    expect(kinds).toEqual(["apiKey", "apiKey", "apiKey"]);
  });

  it("flags meeting links, which must never be public", () => {
    expect(checkSensitive("join https://ucsd.zoom.us/j/123456789")[0].kind).toBe("meetingLink");
  });

  it("does not flag a normal URL to documentation", () => {
    expect(checkSensitive("see https://arxiv.org/abs/1706.03762")).toEqual([]);
  });
});
