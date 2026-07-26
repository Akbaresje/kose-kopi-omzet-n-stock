import { db } from "@/db";
import { inventoryItems, omzetRecords, restockOrders, restockOrderItems, activityLogs, appSettings } from "@/db/schema";
import { count } from "drizzle-orm";

export async function checkAndSeedDatabase() {
  const [existingItems] = await db.select({ count: count() }).from(inventoryItems);
  if (existingItems.count > 0) {
    return { seeded: false, message: "Database already contains data." };
  }

  console.log("Seeding KOSE Cafe database...");

  // 1. Data Stok dari Pengguna (Gudang vs Bar)
  const itemsData = [
    // ☕ KOPI
    { name: "Blend Biji", category: "KOPI", unit: "Pack", gudangStock: 4, barStock: 18, minBarStock: 3, pricePerUnit: 180000 },
    { name: "Blend KS", category: "KOPI", unit: "Pack", gudangStock: 3, barStock: 9, minBarStock: 3, pricePerUnit: 175000 },
    { name: "Malabar", category: "KOPI", unit: "Pack", gudangStock: 5, barStock: 0, minBarStock: 2, pricePerUnit: 200000 },
    { name: "Manglayang", category: "KOPI", unit: "Pack", gudangStock: 1, barStock: 0, minBarStock: 2, pricePerUnit: 160000 },
    { name: "Mandailing", category: "KOPI", unit: "Pack", gudangStock: 1, barStock: 0, minBarStock: 2, pricePerUnit: 180000 },
    { name: "Toraja Sapan", category: "KOPI", unit: "Pack", gudangStock: 3, barStock: 0, minBarStock: 2, pricePerUnit: 190000 },
    { name: "Ijen Raung", category: "KOPI", unit: "Pack", gudangStock: 5, barStock: 0, minBarStock: 2, pricePerUnit: 185000 },
    { name: "Cikuray", category: "KOPI", unit: "Pack", gudangStock: 0, barStock: 0, minBarStock: 2, pricePerUnit: 170000 },
    { name: "Garut Nanas", category: "KOPI", unit: "Pack", gudangStock: 1, barStock: 0, minBarStock: 2, pricePerUnit: 175000 },
    { name: "Kerinci Jambi", category: "KOPI", unit: "Pack", gudangStock: 0, barStock: 0, minBarStock: 2, pricePerUnit: 195000 },

    // 🍫 POWDER
    { name: "Creamer", category: "POWDER", unit: "Pack", gudangStock: 7, barStock: 18, minBarStock: 3, pricePerUnit: 65000 },
    { name: "Coklat", category: "POWDER", unit: "Pack", gudangStock: 2, barStock: 3, minBarStock: 2, pricePerUnit: 85000 },
    { name: "Frappe Base", category: "POWDER", unit: "Pack", gudangStock: 0, barStock: 18, minBarStock: 3, pricePerUnit: 95000 },
    { name: "Green Tea", category: "POWDER", unit: "Pack", gudangStock: 0, barStock: 2, minBarStock: 2, pricePerUnit: 90000 },
    { name: "Red Velvet", category: "POWDER", unit: "Pack", gudangStock: 1, barStock: 2, minBarStock: 2, pricePerUnit: 88000 },

    // 🥤 CUP
    { name: "Cup Kecil", category: "CUP", unit: "Pack", gudangStock: 19, barStock: 45, minBarStock: 10, pricePerUnit: 45000 },
    { name: "Cup Besar", category: "CUP", unit: "Pack", gudangStock: 0, barStock: 9, minBarStock: 5, pricePerUnit: 55000 },
    { name: "Sealer", category: "CUP", unit: "Pcs", gudangStock: 0, barStock: 4, minBarStock: 2, pricePerUnit: 125000 },
    { name: "Sedotan", category: "CUP", unit: "Pack", gudangStock: 1, barStock: 8, minBarStock: 3, pricePerUnit: 35000 },

    // 🧪 SIRUP
    { name: "Caramel", category: "SIRUP", unit: "Botol", gudangStock: 0, barStock: 1, minBarStock: 2, pricePerUnit: 115000 },
    { name: "Hazelnut", category: "SIRUP", unit: "Botol", gudangStock: 0, barStock: 0, minBarStock: 2, pricePerUnit: 115000 },
    { name: "Kiwi", category: "SIRUP", unit: "Botol", gudangStock: 2, barStock: 0, minBarStock: 2, pricePerUnit: 110000 },
    { name: "Lychee", category: "SIRUP", unit: "Botol", gudangStock: 0, barStock: 1, minBarStock: 2, pricePerUnit: 110000 },
    { name: "Mango", category: "SIRUP", unit: "Botol", gudangStock: 0, barStock: 0, minBarStock: 2, pricePerUnit: 110000 },
    { name: "Vanilla", category: "SIRUP", unit: "Botol", gudangStock: 0, barStock: 0, minBarStock: 2, pricePerUnit: 115000 },
  ];

  const insertedItems = await db.insert(inventoryItems).values(itemsData).returning();

  // 2. Data Simulasi Omzet Harian (30 Hari di Bulan April 2026 + Rekap Bulanan Sebelumnya)
  const sampleOmzet = [
    { date: "2025-11-30", monthYear: "Nov 2025", revenue: 52400000, cupsSold: 2150, kopiRevenue: 34500000, nonKopiRevenue: 17900000, notes: "Total Rekap November" },
    { date: "2025-12-31", monthYear: "Des 2025", revenue: 68900000, cupsSold: 2840, kopiRevenue: 45000000, nonKopiRevenue: 23900000, notes: "Musim liburan akhir tahun, penjualan melesat" },
    { date: "2026-01-31", monthYear: "Jan 2026", revenue: 49800000, cupsSold: 2010, kopiRevenue: 32800000, nonKopiRevenue: 17000000, notes: "Total Rekap Januari" },

    // Detail harian Februari 2026
    { date: "2026-02-05", monthYear: "Feb 2026", revenue: 11200000, cupsSold: 460, kopiRevenue: 7500000, nonKopiRevenue: 3700000, notes: "Awal bulan stabil" },
    { date: "2026-02-14", monthYear: "Feb 2026", revenue: 16500000, cupsSold: 680, kopiRevenue: 11000000, nonKopiRevenue: 5500000, notes: "Promo Valentine iced latte ramai pasangan" },
    { date: "2026-02-21", monthYear: "Feb 2026", revenue: 14100000, cupsSold: 590, kopiRevenue: 9500000, nonKopiRevenue: 4600000, notes: "Sabtu akhir pekan" },
    { date: "2026-02-28", monthYear: "Feb 2026", revenue: 14500000, cupsSold: 610, kopiRevenue: 9500000, nonKopiRevenue: 5000000, notes: "Penutupan rekap akhir bulan Februari" },

    // Detail harian Maret 2026
    { date: "2026-03-05", monthYear: "Mar 2026", revenue: 12500000, cupsSold: 520, kopiRevenue: 8200000, nonKopiRevenue: 4300000, notes: "Kamis pekan pertama" },
    { date: "2026-03-12", monthYear: "Mar 2026", revenue: 13800000, cupsSold: 570, kopiRevenue: 9100000, nonKopiRevenue: 4700000, notes: "Ramai jam makan siang" },
    { date: "2026-03-19", monthYear: "Mar 2026", revenue: 15200000, cupsSold: 630, kopiRevenue: 10000000, nonKopiRevenue: 5200000, notes: "Acara musik akustik malam hari" },
    { date: "2026-03-26", monthYear: "Mar 2026", revenue: 12100000, cupsSold: 500, kopiRevenue: 8000000, nonKopiRevenue: 4100000, notes: "Cuaca cerah jelang akhir bulan" },
    { date: "2026-03-31", monthYear: "Mar 2026", revenue: 10900000, cupsSold: 460, kopiRevenue: 6700000, nonKopiRevenue: 4200000, notes: "Rekap penutupan Maret" },

    // Detail harian April 2026 (sampai hari ini)
    { date: "2026-04-01", monthYear: "Apr 2026", revenue: 2150000, cupsSold: 88, kopiRevenue: 1450000, nonKopiRevenue: 700000, notes: "Rabu - Stabil" },
    { date: "2026-04-02", monthYear: "Apr 2026", revenue: 2450000, cupsSold: 96, kopiRevenue: 1600000, nonKopiRevenue: 850000, notes: "Kamis - Kopi Malabar jadi favorit" },
    { date: "2026-04-03", monthYear: "Apr 2026", revenue: 3100000, cupsSold: 124, kopiRevenue: 2000000, nonKopiRevenue: 1100000, notes: "Jumat berkah ramai jelang malam" },
    { date: "2026-04-04", monthYear: "Apr 2026", revenue: 4250000, cupsSold: 172, kopiRevenue: 2800000, nonKopiRevenue: 1450000, notes: "Sabtu akhir pekan sangat ramai!" },
    { date: "2026-04-05", monthYear: "Apr 2026", revenue: 3890000, cupsSold: 156, kopiRevenue: 2500000, nonKopiRevenue: 1390000, notes: "Minggu pagi rame nongkrong pesepeda" },
    { date: "2026-04-06", monthYear: "Apr 2026", revenue: 1980000, cupsSold: 80, kopiRevenue: 1300000, nonKopiRevenue: 680000, notes: "Senin sedikit gerimis" },
    { date: "2026-04-07", monthYear: "Apr 2026", revenue: 2350000, cupsSold: 95, kopiRevenue: 1550000, nonKopiRevenue: 800000, notes: "Selasa cerah" },
    { date: "2026-04-08", monthYear: "Apr 2026", revenue: 2800000, cupsSold: 112, kopiRevenue: 1850000, nonKopiRevenue: 950000, notes: "Banyak pesanan delivery online" },
    { date: "2026-04-09", monthYear: "Apr 2026", revenue: 3500000, cupsSold: 140, kopiRevenue: 2300000, nonKopiRevenue: 1200000, notes: "Kamis malam jelang weekend" },
    { date: "2026-04-10", monthYear: "Apr 2026", revenue: 3200000, cupsSold: 128, kopiRevenue: 2100000, nonKopiRevenue: 1100000, notes: "Hari Ini - omzet siang sampai malam" },
  ];

  await db.insert(omzetRecords).values(sampleOmzet);

  // 3. Simulasi Pesanan dari Bar ke Gudang yang PENDING
  const torajaItem = insertedItems.find((i) => i.name === "Toraja Sapan");
  const kiwiItem = insertedItems.find((i) => i.name === "Kiwi");
  const malabarItem = insertedItems.find((i) => i.name === "Malabar");

  if (torajaItem && kiwiItem && malabarItem) {
    const [newOrder] = await db.insert(restockOrders).values({
      orderNumber: "REQ-202604-001",
      status: "PENDING",
      notes: "Mohon segera dikirim ke Bar sebelum jam ramai sore!",
      requestedBy: "Barista Budi (Shift Pagi)",
    }).returning();

    await db.insert(restockOrderItems).values([
      { orderId: newOrder.id, itemId: torajaItem.id, itemName: torajaItem.name, requestedQty: 2, approvedQty: 2, unit: "Pack" },
      { orderId: newOrder.id, itemId: kiwiItem.id, itemName: kiwiItem.name, requestedQty: 1, approvedQty: 1, unit: "Botol" },
      { orderId: newOrder.id, itemId: malabarItem.id, itemName: malabarItem.name, requestedQty: 2, approvedQty: 2, unit: "Pack" }
    ]);
  }

  // 4. Log Aktivitas
  await db.insert(activityLogs).values([
    { type: "OMZET_ADD", title: "Omzet Hari Ini Dicuplik", description: "Rp 3.200.000 tercatat untuk 10 April 2026" },
    { type: "ORDER_CREATE", title: "Permintaan Restock REQ-202604-001", description: "Barista Budi mengajukan order Toraja Sapan, Kiwi, dan Malabar ke Gudang" },
    { type: "MANUAL_EDIT", title: "Inisialisasi Stok KOSE Cafe", description: "Sistem berhasil tersambung dengan daftar stok eceran bar & grosir gudang" }
  ]);

  // 5. Default Settings
  await db.insert(appSettings).values([
    { settingKey: "MONTHLY_OMZET_TARGET", settingValue: "75000000" },
  ]);

  return { seeded: true, message: "KOSE Cafe database successfully seeded!" };
}
