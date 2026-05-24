import { describe, it, expect } from "vitest";
import {
  GalleryError,
  GalleryNotFoundError,
  CategoryNotFoundError,
  CategoryInUseError,
  PermissionDeniedError,
} from "../src/errors";

describe("typed errors — GalleryError", () => {
  it("is an Error subclass with name = 'GalleryError'", () => {
    const e = new GalleryError("boom");
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(GalleryError);
    expect(e.name).toBe("GalleryError");
    expect(e.message).toBe("boom");
  });
});

describe("typed errors — GalleryNotFoundError", () => {
  it("inherits from GalleryError and carries id", () => {
    const e = new GalleryNotFoundError("g-1");
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(GalleryError);
    expect(e).toBeInstanceOf(GalleryNotFoundError);
    expect(e.name).toBe("GalleryNotFoundError");
    expect(e.id).toBe("g-1");
    expect(e.message).toBe("Gallery not found: g-1");
  });

  it("is NOT a CategoryNotFoundError (cross-class instanceof negative)", () => {
    const e = new GalleryNotFoundError("g-1");
    expect(e).not.toBeInstanceOf(CategoryNotFoundError);
  });
});

describe("typed errors — CategoryNotFoundError", () => {
  it("inherits from GalleryError and carries id", () => {
    const e = new CategoryNotFoundError("c-1");
    expect(e).toBeInstanceOf(GalleryError);
    expect(e).toBeInstanceOf(CategoryNotFoundError);
    expect(e.name).toBe("CategoryNotFoundError");
    expect(e.id).toBe("c-1");
    expect(e.message).toBe("Category not found: c-1");
  });
});

describe("typed errors — CategoryInUseError", () => {
  it("inherits from GalleryError and carries categoryId + galleryCount", () => {
    const e = new CategoryInUseError("c-1", 3);
    expect(e).toBeInstanceOf(GalleryError);
    expect(e).toBeInstanceOf(CategoryInUseError);
    expect(e.name).toBe("CategoryInUseError");
    expect(e.categoryId).toBe("c-1");
    expect(e.galleryCount).toBe(3);
    expect(e.message).toBe("Category c-1 is in use by 3 galleries");
  });
});

describe("typed errors — PermissionDeniedError", () => {
  it("inherits from GalleryError, carries action and resourceId", () => {
    const e = new PermissionDeniedError("edit", "g-1");
    expect(e).toBeInstanceOf(GalleryError);
    expect(e).toBeInstanceOf(PermissionDeniedError);
    expect(e.name).toBe("PermissionDeniedError");
    expect(e.action).toBe("edit");
    expect(e.resourceId).toBe("g-1");
    expect(e.message).toBe("Permission denied: cannot edit g-1");
  });

  it("accepts 'delete' action", () => {
    const e = new PermissionDeniedError("delete", "c-9");
    expect(e.action).toBe("delete");
    expect(e.message).toBe("Permission denied: cannot delete c-9");
  });
});
