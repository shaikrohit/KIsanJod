// ============================================================================
// KisanJod - Agmarknet Daily Mandi Prices & MSP Benchmark Mock Service
// Directorate of Marketing & Inspection (DMI), Ministry of Agriculture
// 100% Self-Contained Local Implementation — Zero External Network Calls
// ============================================================================

export interface CropCommodityInfo {
  id: string;
  commodityKey: string;
  nameEn: string;
  nameHi: string;
  nameTe: string;
  category: "GRAINS" | "PULSES" | "VEGETABLES_FRUITS";
  variety: string;
  notifiedMspPerQtl: number;
  gradeABonusPerQtl: number;
  pricingAuthority: "CACP" | "DOCA_PSF";
  season: "RABI" | "KHARIF" | "ALL_SEASON";
  standardPackaging: "GUNNY_BAG_50KG" | "CRATE_25KG" | "QUINTALS";
  kgPerPackage: number;
  maxMoisturePctFAQ: number;
  maxMoisturePctGradeA: number;
  iconName: string;
}

export interface AgmarknetPriceBulletin {
  bulletinDate: string;
  state: string;
  district: string;
  marketName: string;
  commodity: string;
  variety: string;
  grade: "FAQ" | "GRADE_A";
  arrivalsTonnes: number;
  minPricePerQtl: number;
  maxPricePerQtl: number;
  modalPricePerQtl: number;
  notifiedMspRatePerQtl: number;
  source: string;
}

// ----------------------------------------------------------------------------
// Official Crop Catalog & Notified MSP Matrix
// Wheat ₹2,275, Paddy ₹2,183, Chana ₹5,440, Moong ₹8,558, Onion ₹1,800, Tomato ₹1,500, Potato ₹1,200
// ----------------------------------------------------------------------------

export const CROP_CATALOG: CropCommodityInfo[] = [
  {
    id: "crop_wheat",
    commodityKey: "WHEAT",
    nameEn: "Wheat",
    nameHi: "गेहूं",
    nameTe: "గోధుమలు",
    category: "GRAINS",
    variety: "Kalyan Sona / PBW-343",
    notifiedMspPerQtl: 2275.0,
    gradeABonusPerQtl: 0.0,
    pricingAuthority: "CACP",
    season: "RABI",
    standardPackaging: "GUNNY_BAG_50KG",
    kgPerPackage: 50,
    maxMoisturePctFAQ: 12.0,
    maxMoisturePctGradeA: 10.0,
    iconName: "wheat",
  },
  {
    id: "crop_paddy",
    commodityKey: "PADDY",
    nameEn: "Paddy",
    nameHi: "धान",
    nameTe: "వరి",
    category: "GRAINS",
    variety: "PR-126 / Swarna / MTU-1010",
    notifiedMspPerQtl: 2183.0,
    gradeABonusPerQtl: 20.0, // Grade A is ₹2,203/Qtl
    pricingAuthority: "CACP",
    season: "KHARIF",
    standardPackaging: "GUNNY_BAG_50KG",
    kgPerPackage: 50,
    maxMoisturePctFAQ: 17.0,
    maxMoisturePctGradeA: 14.0,
    iconName: "paddy",
  },
  {
    id: "crop_chana",
    commodityKey: "CHANA",
    nameEn: "Chana",
    nameHi: "चना",
    nameTe: "శనగలు",
    category: "PULSES",
    variety: "Desi Chana / Kabuli",
    notifiedMspPerQtl: 5440.0,
    gradeABonusPerQtl: 0.0,
    pricingAuthority: "CACP",
    season: "RABI",
    standardPackaging: "GUNNY_BAG_50KG",
    kgPerPackage: 50,
    maxMoisturePctFAQ: 10.0,
    maxMoisturePctGradeA: 8.5,
    iconName: "chana",
  },
  {
    id: "crop_moong",
    commodityKey: "MOONG",
    nameEn: "Moong",
    nameHi: "मूंग",
    nameTe: "పెసలు",
    category: "PULSES",
    variety: "Samrat / SML-668 / WGG-42",
    notifiedMspPerQtl: 8558.0,
    gradeABonusPerQtl: 0.0,
    pricingAuthority: "CACP",
    season: "KHARIF",
    standardPackaging: "GUNNY_BAG_50KG",
    kgPerPackage: 50,
    maxMoisturePctFAQ: 10.0,
    maxMoisturePctGradeA: 8.0,
    iconName: "moong",
  },
  {
    id: "crop_onion",
    commodityKey: "ONION",
    nameEn: "Onion",
    nameHi: "प्याज",
    nameTe: "ఉల్లిపాయ",
    category: "VEGETABLES_FRUITS",
    variety: "Nashik Red / Garwa",
    notifiedMspPerQtl: 1800.0,
    gradeABonusPerQtl: 0.0,
    pricingAuthority: "DOCA_PSF",
    season: "ALL_SEASON",
    standardPackaging: "GUNNY_BAG_50KG",
    kgPerPackage: 50,
    maxMoisturePctFAQ: 15.0,
    maxMoisturePctGradeA: 12.0,
    iconName: "onion",
  },
  {
    id: "crop_tomato",
    commodityKey: "TOMATO",
    nameEn: "Tomato",
    nameHi: "टमाटर",
    nameTe: "టమోటా",
    category: "VEGETABLES_FRUITS",
    variety: "Hybrid Vaishali / Sahu",
    notifiedMspPerQtl: 1500.0,
    gradeABonusPerQtl: 0.0,
    pricingAuthority: "DOCA_PSF",
    season: "ALL_SEASON",
    standardPackaging: "CRATE_25KG",
    kgPerPackage: 25,
    maxMoisturePctFAQ: 85.0,
    maxMoisturePctGradeA: 80.0,
    iconName: "tomato",
  },
  {
    id: "crop_potato",
    commodityKey: "POTATO",
    nameEn: "Potato",
    nameHi: "आलू",
    nameTe: "బంగాళాదుంప",
    category: "VEGETABLES_FRUITS",
    variety: "Kufri Jyoti / Chipsona",
    notifiedMspPerQtl: 1200.0,
    gradeABonusPerQtl: 0.0,
    pricingAuthority: "DOCA_PSF",
    season: "RABI",
    standardPackaging: "GUNNY_BAG_50KG",
    kgPerPackage: 50,
    maxMoisturePctFAQ: 18.0,
    maxMoisturePctGradeA: 14.0,
    iconName: "potato",
  },
];

// Compatibility map of commodity names to MSP data
export const CACP_NOTIFIED_MSP: Record<string, {
  name: string;
  category: "GRAINS" | "PULSES" | "VEGETABLES_FRUITS";
  officialMspPerQtl: number;
  faqMoistureMaxPct: number;
  packagingDefaultUnit: "GUNNY_BAG_50KG" | "CRATE_25KG" | "QUINTALS";
}> = {
  Wheat: {
    name: "Wheat",
    category: "GRAINS",
    officialMspPerQtl: 2275.0,
    faqMoistureMaxPct: 12.0,
    packagingDefaultUnit: "GUNNY_BAG_50KG",
  },
  Paddy: {
    name: "Paddy",
    category: "GRAINS",
    officialMspPerQtl: 2183.0,
    faqMoistureMaxPct: 17.0,
    packagingDefaultUnit: "GUNNY_BAG_50KG",
  },
  Chana: {
    name: "Chana",
    category: "PULSES",
    officialMspPerQtl: 5440.0,
    faqMoistureMaxPct: 10.0,
    packagingDefaultUnit: "GUNNY_BAG_50KG",
  },
  Moong: {
    name: "Moong",
    category: "PULSES",
    officialMspPerQtl: 8558.0,
    faqMoistureMaxPct: 10.0,
    packagingDefaultUnit: "GUNNY_BAG_50KG",
  },
  Onion: {
    name: "Onion",
    category: "VEGETABLES_FRUITS",
    officialMspPerQtl: 1800.0,
    faqMoistureMaxPct: 15.0,
    packagingDefaultUnit: "GUNNY_BAG_50KG",
  },
  Tomato: {
    name: "Tomato",
    category: "VEGETABLES_FRUITS",
    officialMspPerQtl: 1500.0,
    faqMoistureMaxPct: 85.0,
    packagingDefaultUnit: "CRATE_25KG",
  },
  Potato: {
    name: "Potato",
    category: "VEGETABLES_FRUITS",
    officialMspPerQtl: 1200.0,
    faqMoistureMaxPct: 18.0,
    packagingDefaultUnit: "GUNNY_BAG_50KG",
  },
};

// ----------------------------------------------------------------------------
// Mock Service Methods
// ----------------------------------------------------------------------------

export const agmarknetMock = {
  /**
   * Return entire crop catalog
   */
  getCropCatalog(): CropCommodityInfo[] {
    return CROP_CATALOG;
  },

  /**
   * Find crop by name or commodity key
   * Strict validation: Rejects empty strings, whitespace-only strings, null/undefined.
   * Substring matching is strictly restricted to queries with at least 3 characters.
   */
  getCrop(cropIdentifier: string): CropCommodityInfo | undefined {
    if (!cropIdentifier || typeof cropIdentifier !== "string") {
      return undefined;
    }

    const trimmed = cropIdentifier.trim();
    if (trimmed.length === 0) {
      return undefined;
    }

    const lower = trimmed.toLowerCase();

    // Pass 1: Exact matches have highest priority (key, english name, id, hindi, telugu)
    const exactMatch = CROP_CATALOG.find(
      (c) =>
        c.commodityKey.toLowerCase() === lower ||
        c.nameEn.toLowerCase() === lower ||
        c.id.toLowerCase() === lower ||
        c.nameHi === trimmed ||
        c.nameTe === trimmed
    );
    if (exactMatch) {
      return exactMatch;
    }

    // Pass 2: Substring matching (strictly requires at least 3 characters)
    if (lower.length >= 3) {
      return CROP_CATALOG.find(
        (c) =>
          c.nameEn.toLowerCase().includes(lower) ||
          c.commodityKey.toLowerCase().includes(lower)
      );
    }

    return undefined;
  },

  /**
   * Get notified MSP rate for a crop and quality grade
   */
  getMspRate(commodityName: string, grade: "GRADE_A" | "FAQ" = "FAQ"): number {
    if (!commodityName || typeof commodityName !== "string" || commodityName.trim().length === 0) {
      throw new Error(`Crop commodity "${commodityName ?? ''}" not found in Agmarknet CACP database.`);
    }

    const crop = this.getCrop(commodityName);
    if (!crop) {
      // Direct fallback lookup from CACP table
      const trimmed = commodityName.trim().toLowerCase();
      const cacpKey = Object.keys(CACP_NOTIFIED_MSP).find(
        (k) => k.toLowerCase() === trimmed
      );
      if (cacpKey) {
        return CACP_NOTIFIED_MSP[cacpKey].officialMspPerQtl;
      }
      throw new Error(`Crop commodity "${commodityName}" not found in Agmarknet CACP database.`);
    }

    if (grade === "GRADE_A") {
      return crop.notifiedMspPerQtl + crop.gradeABonusPerQtl;
    }
    return crop.notifiedMspPerQtl;
  },

  /**
   * Convert physical packaging units (gunny bags or crates) into metric quintals
   * 1 Quintal = 100 kg = 2 Gunny Bags (50kg) = 4 Crates (25kg)
   */
  convertToQuintals(packageCount: number, unitType: "GUNNY_BAG_50KG" | "CRATE_25KG" | "QUINTALS"): number {
    if (unitType === "GUNNY_BAG_50KG") {
      return parseFloat((packageCount * 0.5).toFixed(2));
    }
    if (unitType === "CRATE_25KG") {
      return parseFloat((packageCount * 0.25).toFixed(2));
    }
    return parseFloat(packageCount.toFixed(2));
  },

  /**
   * Calculate statutory J-Form payout math
   */
  calculatePayout(
    cropName: string,
    netWeightQtl: number,
    grade: "GRADE_A" | "FAQ" = "FAQ"
  ): {
    mspRate: number;
    grossAmount: number;
    deductions: number;
    netPayable: number;
  } {
    const mspRate = this.getMspRate(cropName, grade);
    const grossAmount = parseFloat((netWeightQtl * mspRate).toFixed(2));
    const deductions = 0.0; // Official government procurement has 0 farmer deductions
    const netPayable = grossAmount - deductions;

    return {
      mspRate,
      grossAmount,
      deductions,
      netPayable,
    };
  },

  /**
   * Simulate Agmarknet Daily Market Price & Arrival Bulletin
   */
  getDailyBulletin(cropName: string, district: string = "Ludhiana"): AgmarknetPriceBulletin {
    const crop = this.getCrop(cropName) || CROP_CATALOG[0];
    const msp = crop.notifiedMspPerQtl;

    return {
      bulletinDate: new Date().toISOString().split("T")[0],
      state: "Punjab",
      district: district,
      marketName: `${district} Mandi Yard`,
      commodity: crop.nameEn,
      variety: crop.variety,
      grade: "FAQ",
      arrivalsTonnes: Math.floor(200 + Math.random() * 300),
      minPricePerQtl: parseFloat((msp * 0.98).toFixed(2)),
      maxPricePerQtl: parseFloat((msp * 1.02).toFixed(2)),
      modalPricePerQtl: parseFloat((msp * 1.005).toFixed(2)),
      notifiedMspRatePerQtl: msp,
      source: "Agmarknet National Portal (Mock Simulation)",
    };
  },
};

export default agmarknetMock;

