import { db } from "../src/lib/db";

export async function seedSecondaryLand() {
  console.log("Adding secondary agricultural land holdings...");
  const secondaryLands = [
    {
      farmerId: "farmer_001",
      khasraNumber: "143/4",
      khatauniNumber: "KH-00422",
      village: "Rampur",
      subDistrictTehsil: "Ludhiana West",
      district: "Ludhiana",
      state: "Punjab",
      totalLandAreaAcres: 3.0,
      cropSeason: "KHARIF_2024_25",
      verifiedSownCrop: "Paddy",
      sownAreaAcres: 3.0,
      mspProductivityNormQtlPerAcre: 28.0,
      maxProcurementQuotaQtl: 84.0,
      utilizedQuotaQtl: 0.0,
    },
    {
      farmerId: "farmer_002",
      khasraNumber: "205/1",
      khatauniNumber: "KH-00813",
      village: "Dharmavaram",
      subDistrictTehsil: "Guntur Rural",
      district: "Guntur",
      state: "Andhra Pradesh",
      totalLandAreaAcres: 2.0,
      cropSeason: "RABI_2024_25",
      verifiedSownCrop: "Moong",
      sownAreaAcres: 2.0,
      mspProductivityNormQtlPerAcre: 6.5,
      maxProcurementQuotaQtl: 13.0,
      utilizedQuotaQtl: 0.0,
    },
    {
      farmerId: "farmer_003",
      khasraNumber: "90/C",
      khatauniNumber: "KH-00201",
      village: "Shyampur",
      subDistrictTehsil: "Sehore",
      district: "Sehore",
      state: "Madhya Pradesh",
      totalLandAreaAcres: 2.0,
      cropSeason: "RABI_2024_25",
      verifiedSownCrop: "Wheat",
      sownAreaAcres: 2.0,
      mspProductivityNormQtlPerAcre: 25.0,
      maxProcurementQuotaQtl: 50.0,
      utilizedQuotaQtl: 0.0,
    },
    {
      farmerId: "farmer_004",
      khasraNumber: "52/1",
      khatauniNumber: "KH-00555",
      village: "Lasalgaon",
      subDistrictTehsil: "Niphad",
      district: "Nashik",
      state: "Maharashtra",
      totalLandAreaAcres: 1.0,
      cropSeason: "RABI_2024_25",
      verifiedSownCrop: "Tomato",
      sownAreaAcres: 1.0,
      mspProductivityNormQtlPerAcre: 90.0,
      maxProcurementQuotaQtl: 90.0,
      utilizedQuotaQtl: 0.0,
    },
    {
      farmerId: "farmer_005",
      khasraNumber: "312/1",
      khatauniNumber: "KH-00312",
      village: "Gharaunda",
      subDistrictTehsil: "Karnal",
      district: "Karnal",
      state: "Haryana",
      totalLandAreaAcres: 2.5,
      cropSeason: "KHARIF_2024_25",
      verifiedSownCrop: "Paddy",
      sownAreaAcres: 2.5,
      mspProductivityNormQtlPerAcre: 28.0,
      maxProcurementQuotaQtl: 70.0,
      utilizedQuotaQtl: 0.0,
    },
    {
      farmerId: "farmer_006",
      khasraNumber: "103/2",
      khatauniNumber: "KH-00103",
      village: "Atmakur",
      subDistrictTehsil: "Warangal Rural",
      district: "Warangal",
      state: "Telangana",
      totalLandAreaAcres: 2.0,
      cropSeason: "KHARIF_2024_25",
      verifiedSownCrop: "Paddy",
      sownAreaAcres: 2.0,
      mspProductivityNormQtlPerAcre: 28.0,
      maxProcurementQuotaQtl: 56.0,
      utilizedQuotaQtl: 0.0,
    },
    {
      farmerId: "farmer_007",
      khasraNumber: "46/2",
      khatauniNumber: "KH-00046",
      village: "Pindra",
      subDistrictTehsil: "Pindra",
      district: "Varanasi",
      state: "Uttar Pradesh",
      totalLandAreaAcres: 1.0,
      cropSeason: "RABI_2024_25",
      verifiedSownCrop: "Potato",
      sownAreaAcres: 1.0,
      mspProductivityNormQtlPerAcre: 100.0,
      maxProcurementQuotaQtl: 100.0,
      utilizedQuotaQtl: 0.0,
    },
    {
      farmerId: "farmer_008",
      khasraNumber: "113/1",
      khatauniNumber: "KH-00113",
      village: "Fatehabad",
      subDistrictTehsil: "Fatehabad",
      district: "Agra",
      state: "Uttar Pradesh",
      totalLandAreaAcres: 2.0,
      cropSeason: "RABI_2024_25",
      verifiedSownCrop: "Wheat",
      sownAreaAcres: 2.0,
      mspProductivityNormQtlPerAcre: 25.0,
      maxProcurementQuotaQtl: 50.0,
      utilizedQuotaQtl: 0.0,
    },
  ];

  for (const land of secondaryLands) {
    const existing = await db.landRecord.findFirst({
      where: { farmerId: land.farmerId, verifiedSownCrop: land.verifiedSownCrop },
    });
    if (!existing) {
      await db.landRecord.create({ data: land });
      console.log(`✓ Added ${land.verifiedSownCrop} (${land.maxProcurementQuotaQtl} Qtl) for ${land.farmerId}`);
    } else {
      console.log(`- Already present: ${land.farmerId} ${land.verifiedSownCrop}`);
    }
  }

  const total = await db.landRecord.count();
  console.log(`✅ Total Land Holdings in Database: ${total}`);
}

if (require.main === module) {
  seedSecondaryLand()
    .catch((err) => {
      console.error("Error seeding secondary land:", err);
      process.exit(1);
    })
    .finally(async () => {
      await db.$disconnect();
    });
}
