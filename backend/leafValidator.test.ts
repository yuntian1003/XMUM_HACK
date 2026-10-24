import { describe, it, expect } from "vitest";
import { validateLeafImage } from "../frontend/src/lib/leafValidator";

/**
 * Leaf Validator Unit Tests
 * Tests the leaf validation algorithm with various image scenarios
 * Note: These tests use Node.js canvas API via JSDOM polyfill
 */

// Lightweight canvas/Image polyfill for the Node.js test environment.
if (typeof document === "undefined") {
  type Path =
    | { type: "arc"; x: number; y: number; radius: number }
    | { type: "ellipse"; x: number; y: number; rx: number; ry: number };

  const objectUrls = new Map<string, { data: Uint8ClampedArray; width: number; height: number }>();
  let objectUrlId = 0;

  function parseHexColor(value: string): [number, number, number, number] {
    const normalized = value.replace("#", "");
    return [
      parseInt(normalized.slice(0, 2), 16),
      parseInt(normalized.slice(2, 4), 16),
      parseInt(normalized.slice(4, 6), 16),
      255,
    ];
  }

  class FakeCanvas {
    private pixels = new Uint8ClampedArray(256 * 256 * 4);
    private _width = 256;
    private _height = 256;

    get width() {
      return this._width;
    }

    set width(value: number) {
      this._width = value;
      this.resize();
    }

    get height() {
      return this._height;
    }

    set height(value: number) {
      this._height = value;
      this.resize();
    }

    get data() {
      return this.pixels;
    }

    set data(value: Uint8ClampedArray) {
      this.pixels = value;
    }

    getContext() {
      return new FakeCanvasContext(this);
    }

    toBlob(callback: (blob: Blob) => void) {
      const blob = new Blob(["fake-image"], { type: "image/png" });
      (blob as any).__pixels = new Uint8ClampedArray(this.pixels);
      (blob as any).__width = this._width;
      (blob as any).__height = this._height;
      callback(blob);
    }

    private resize() {
      this.pixels = new Uint8ClampedArray(this._width * this._height * 4);
    }
  }

  class FakeCanvasContext {
    fillStyle = "#000000";
    private path: Path | null = null;

    constructor(private readonly canvas: FakeCanvas) {}

    fillRect(x: number, y: number, width: number, height: number) {
      this.paint((px, py) => px >= x && px < x + width && py >= y && py < y + height);
    }

    beginPath() {
      this.path = null;
    }

    arc(x: number, y: number, radius: number) {
      this.path = { type: "arc", x, y, radius };
    }

    ellipse(x: number, y: number, rx: number, ry: number) {
      this.path = { type: "ellipse", x, y, rx, ry };
    }

    fill() {
      if (!this.path) return;
      const path = this.path;
      if (path.type === "arc") {
        this.paint((px, py) => Math.hypot(px - path.x, py - path.y) <= path.radius);
      } else {
        this.paint((px, py) => ((px - path.x) ** 2) / (path.rx ** 2) + ((py - path.y) ** 2) / (path.ry ** 2) <= 1);
      }
    }

    drawImage(image: any) {
      if (image.__pixels) this.canvas.data = new Uint8ClampedArray(image.__pixels);
    }

    getImageData() {
      return { data: this.canvas.data };
    }

    private paint(predicate: (x: number, y: number) => boolean) {
      const [r, g, b, a] = parseHexColor(this.fillStyle);
      for (let y = 0; y < this.canvas.height; y++) {
        for (let x = 0; x < this.canvas.width; x++) {
          if (!predicate(x, y)) continue;
          const index = (y * this.canvas.width + x) * 4;
          this.canvas.data[index] = r;
          this.canvas.data[index + 1] = g;
          this.canvas.data[index + 2] = b;
          this.canvas.data[index + 3] = a;
        }
      }
    }
  }

  class FakeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    __pixels: Uint8ClampedArray | null = null;

    set src(value: string) {
      const stored = objectUrls.get(value);
      if (!stored) {
        this.onerror?.();
        return;
      }
      this.__pixels = stored.data;
      this.onload?.();
    }
  }

  (globalThis as any).document = {
    createElement: (tag: string) => {
      if (tag !== "canvas") throw new Error(`Unsupported test element: ${tag}`);
      return new FakeCanvas();
    },
  };
  (globalThis as any).window = globalThis;
  (globalThis as any).Image = FakeImage;
  (globalThis as any).URL = {
    createObjectURL: (blob: Blob) => {
      const url = `blob:test-${++objectUrlId}`;
      objectUrls.set(url, {
        data: (blob as any).__pixels,
        width: (blob as any).__width,
        height: (blob as any).__height,
      });
      return url;
    },
  };
}

describe("leafValidator", () => {
  describe("validateLeafImage", () => {
    it("should accept valid green leaf images", async () => {
      // Create a synthetic green leaf image
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d")!;

      // Draw green leaf-like pattern
      ctx.fillStyle = "#2f8f1f"; // Green
      ctx.fillRect(0, 0, 256, 256);

      // Add some brown spots (disease simulation)
      ctx.fillStyle = "#8b4513"; // Brown
      ctx.beginPath();
      ctx.arc(128, 128, 30, 0, Math.PI * 2);
      ctx.fill();

      // Add yellow halo
      ctx.fillStyle = "#daa520"; // Goldenrod
      ctx.beginPath();
      ctx.arc(128, 128, 35, 0, Math.PI * 2);
      ctx.fill();

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), "image/png");
      });

      const result = await validateLeafImage(blob);

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.details.greenRatio).toBeGreaterThan(0.1);
      expect(result.reason).toContain("Leaf detected");
    });

    it("should reject uniform white/plastic images", async () => {
      // Create a uniform white image (simulating plastic bag)
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d")!;

      // Draw uniform white surface
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 256, 256);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), "image/png");
      });

      const result = await validateLeafImage(blob);

      expect(result.isValid).toBe(false);
      expect(result.details.colorVariance).toBeLessThan(0.2);
      expect(result.reason.toLowerCase()).toMatch(/not enough green|too uniform/);
    });

    it("should reject images with insufficient green color", async () => {
      // Create a brown/dirt image
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d")!;

      // Draw brown dirt-like pattern
      ctx.fillStyle = "#8b7355"; // Brown
      ctx.fillRect(0, 0, 256, 256);

      // Add some gray
      ctx.fillStyle = "#a9a9a9"; // Gray
      ctx.fillRect(50, 50, 100, 100);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), "image/png");
      });

      const result = await validateLeafImage(blob);

      expect(result.isValid).toBe(false);
      expect(result.details.greenRatio).toBeLessThan(0.15);
      expect(result.reason.toLowerCase()).toContain("not enough green");
    });

    it("should detect natural edges in leaf images", async () => {
      // Create an image with natural edges
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d")!;

      // Draw green background
      ctx.fillStyle = "#2f8f1f";
      ctx.fillRect(0, 0, 256, 256);

      // Add leaf-like shape with edges
      ctx.fillStyle = "#1f7a1f"; // Darker green for contrast
      ctx.beginPath();
      ctx.ellipse(128, 128, 80, 100, 0.3, 0, Math.PI * 2);
      ctx.fill();

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), "image/png");
      });

      const result = await validateLeafImage(blob);

      expect(result.details.edgeDetection).toBeGreaterThan(0.1);
      expect(result.isValid).toBe(true);
    });

    it("should calculate color variance correctly", async () => {
      // Create an image with high color variance
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d")!;

      // Create varied pattern
      const colors = ["#0a650a", "#2f8f1f", "#40f020", "#70ff50"];
      for (let i = 0; i < 256; i += 32) {
        for (let j = 0; j < 256; j += 32) {
          ctx.fillStyle = colors[((i / 32) + (j / 32)) % colors.length];
          ctx.fillRect(i, j, 32, 32);
        }
      }

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), "image/png");
      });

      const result = await validateLeafImage(blob);

      expect(result.details.colorVariance).toBeGreaterThan(0.1);
    });

    it("should provide detailed validation metrics", async () => {
      // Create a valid leaf image
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d")!;

      ctx.fillStyle = "#2f8f1f";
      ctx.fillRect(0, 0, 256, 256);

      ctx.fillStyle = "#8b4513";
      ctx.beginPath();
      ctx.arc(100, 100, 25, 0, Math.PI * 2);
      ctx.fill();

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), "image/png");
      });

      const result = await validateLeafImage(blob);

      // Check that all metrics are present
      expect(result.details).toHaveProperty("greenRatio");
      expect(result.details).toHaveProperty("brownRatio");
      expect(result.details).toHaveProperty("yellowRatio");
      expect(result.details).toHaveProperty("whiteRatio");
      expect(result.details).toHaveProperty("redRatio");
      expect(result.details).toHaveProperty("colorVariance");
      expect(result.details).toHaveProperty("edgeDetection");
      expect(result.details).toHaveProperty("leafLikeScore");

      // Check that all values are between 0 and 1
      expect(result.details.greenRatio).toBeGreaterThanOrEqual(0);
      expect(result.details.greenRatio).toBeLessThanOrEqual(1);
      expect(result.details.leafLikeScore).toBeGreaterThanOrEqual(0);
      expect(result.details.leafLikeScore).toBeLessThanOrEqual(1);
    });

    it("should handle images with disease symptoms", async () => {
      // Create a leaf with disease symptoms
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d")!;

      // Green leaf base
      ctx.fillStyle = "#2f8f1f";
      ctx.fillRect(0, 0, 256, 256);

      // Brown disease spots
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = "#8b4513";
        ctx.beginPath();
        ctx.arc(Math.random() * 256, Math.random() * 256, 20, 0, Math.PI * 2);
        ctx.fill();

        // Yellow halos
        ctx.fillStyle = "#daa520";
        ctx.beginPath();
        ctx.arc(Math.random() * 256, Math.random() * 256, 25, 0, Math.PI * 2);
        ctx.fill();
      }

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), "image/png");
      });

      const result = await validateLeafImage(blob);

      // Should still be valid (it's a real leaf)
      expect(result.isValid).toBe(true);
      expect(result.details.brownRatio).toBeGreaterThan(0.05);
      expect(result.details.yellowRatio).toBeGreaterThan(0.05);
    });

    it("should reject images with no color information", async () => {
      // Create a completely black image
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d")!;

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, 256, 256);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), "image/png");
      });

      const result = await validateLeafImage(blob);

      expect(result.isValid).toBe(false);
      expect(result.details.greenRatio).toBeLessThan(0.1);
    });

    it("should calculate leaf-like score correctly", async () => {
      // Create a valid leaf
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d")!;

      ctx.fillStyle = "#2f8f1f";
      ctx.fillRect(0, 0, 256, 256);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), "image/png");
      });

      const result = await validateLeafImage(blob);

      // Leaf-like score should be between 0 and 1
      expect(result.details.leafLikeScore).toBeGreaterThanOrEqual(0);
      expect(result.details.leafLikeScore).toBeLessThanOrEqual(1);

      // For a valid leaf, score should be > 0.5
      if (result.isValid) {
        expect(result.details.leafLikeScore).toBeGreaterThan(0.5);
      }
    });
  });
});
