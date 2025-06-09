import { escapeHtml } from "../../pages/api/transcript";

describe("escapeHtml", () => {
  it("escapes all special HTML characters", () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
  });
  it("returns unchanged string if no special chars", () => {
    expect(escapeHtml('plain text')).toBe('plain text');
  });
  it("escapes mixed content", () => {
    expect(escapeHtml('a&b<c>d"e\'f')).toBe('a&amp;b&lt;c&gt;d&quot;e&#39;f');
  });
});
