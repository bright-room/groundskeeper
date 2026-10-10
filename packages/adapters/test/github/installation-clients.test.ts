import { afterEach, describe, expect, it, vi } from "vitest";
import { octokitLog } from "../../src/github/installation-clients";

afterEach(() => vi.restoreAllMocks());

describe("octokitLog", () => {
  it("呼び出し側で扱う 404 / 410 のリクエストエラーは出さない", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    octokitLog.error("GET /repos/o/r/contents/x - 404 with id A in 10ms");
    octokitLog.error("GET /repos/o/r/issues/1 - 410 with id B in 10ms");
    expect(error).not.toHaveBeenCalled();
  });

  it("それ以外のリクエストエラーは出す", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    octokitLog.error("GET /repos/o/r - 500 with id C in 10ms");
    expect(error).toHaveBeenCalledWith("GET /repos/o/r - 500 with id C in 10ms");
  });
});
