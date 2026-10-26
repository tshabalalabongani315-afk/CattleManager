import { describe, expect, it } from "vitest";
import { escapeCell, toCSV } from "../csv";

describe("escapeCell", () => {
  it("leaves ordinary text alone", () => {
    expect(escapeCell("Nguni")).toBe("Nguni");
    expect(escapeCell(null)).toBe("");
    expect(escapeCell(42)).toBe("42");
  });

  it("quotes cells containing commas, quotes or newlines", () => {
    expect(escapeCell("a,b")).toBe('"a,b"');
    expect(escapeCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCell("line1\nline2")).toBe('"line1\nline2"');
    expect(escapeCell("line1\rline2")).toBe('"line1\rline2"');
  });

  it.each(["=SUM(A1:A9)", "+1+1", "-2+3", "@cmd", "\tTAB", '=HYPERLINK("http://evil","x")'])(
    "neutralises spreadsheet formula injection: %s",
    (payload) => {
      const out = escapeCell(payload);
      // The first real character of the cell must not be a formula trigger.
      const visible = out.startsWith('"') ? out.slice(1) : out;
      expect(visible.startsWith("'")).toBe(true);
    }
  );
});

describe("toCSV", () => {
  it("builds a header and rows in column order", () => {
    const csv = toCSV(
      [
        { key: "tag", label: "Tag" },
        { key: "breed", label: "Breed" },
      ],
      [{ tag: "A1", breed: "Nguni", ignored: "x" }, { tag: "A2", breed: null }]
    );
    expect(csv).toBe("Tag,Breed\nA1,Nguni\nA2,");
  });
});
