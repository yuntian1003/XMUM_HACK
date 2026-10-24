import { describe, it, expect } from "vitest";
import { CROP_TREATMENTS, getCropTreatment, getAvailableCrops } from "../backend/cropTreatments";

describe("cropTreatments", () => {
  it("exports crop treatment data for ASEAN crops", () => {
    expect(CROP_TREATMENTS).toBeDefined();
    expect(CROP_TREATMENTS.rice).toBeDefined();
    expect(CROP_TREATMENTS.cassava).toBeDefined();
    expect(CROP_TREATMENTS.corn).toBeDefined();
  });

  it("lists all available crops with getAvailableCrops()", () => {
    const crops = getAvailableCrops();
    expect(crops.length).toBeGreaterThan(0);
    const rice = crops.find((c) => c.key === "rice");
    expect(rice).toBeDefined();
    expect(rice?.name).toBe("Rice");
    expect(rice?.region).toBe("Southeast Asia");
  });

  it("retrieves disease treatment recommendations correctly", () => {
    const treatment = getCropTreatment("rice", "bacterial_leaf_blight");
    expect(treatment).not.toBeNull();
    expect(treatment?.cropName).toBe("Rice");
    expect(treatment?.chemical).toContain("Copper oxychloride");
    expect(treatment?.dosage).toBeDefined();
    expect(treatment?.expectedRecovery).toBeDefined();
  });

  it("returns null for non-existent crop or disease key", () => {
    expect(getCropTreatment("unknown_crop", "bacterial_leaf_blight")).toBeNull();
    expect(getCropTreatment("rice", "non_existent_disease")).toBeNull();
  });
});
