import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMediaUrl } from "@/app/lib/api";

vi.mock("axios", async () => {
  const actual = await vi.importActual<typeof import("axios")>("axios");
  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn(() => ({
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      })),
    },
  };
});

const MEDIA_BASE = "http://127.0.0.1:8000";

describe("getMediaUrl", () => {
  it("returns null for null input", () => {
    expect(getMediaUrl(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(getMediaUrl(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getMediaUrl("")).toBeNull();
  });

  it("returns absolute URL unchanged", () => {
    const url = "https://cdn.example.com/image.jpg";
    expect(getMediaUrl(url)).toBe(url);
  });

  it("prepends media base to relative path", () => {
    const relativePath = "/media/products/shoe.jpg";
    expect(getMediaUrl(relativePath)).toBe(`${MEDIA_BASE}${relativePath}`);
  });
});
