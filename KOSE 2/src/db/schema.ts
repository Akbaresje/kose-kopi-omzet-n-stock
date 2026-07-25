import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

// 1. Daftar Stok Bahan Baku (Gudang vs Bar)
export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // cth: "Blend Biji", "Caramel", "Cup Kecil"
  category: text("category").notNull(), // "KOPI", "POWDER", "CUP", "SIRUP"
  unit: text("unit").notNull(), // "Pack", "Botol", "Pcs"
  gudangStock: integer("gudang_stock").notNull().default(0),
  barStock: integer("bar_stock").notNull().default(0),
  minBarStock: integer("min_bar_stock").notNull().default(2), // Di bawah atau sama dengan batas ini jadi alert TIPIS/HABIS
  minGudangStock: integer("min_gudang_stock").notNull().default(2),
  pricePerUnit: integer("price_per_unit").notNull().default(100000), // Estimasi nilai rupiah per unit
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 2. Permintaan Order Bahan Baku dari Barista ke Gudang
export const restockOrders = pgTable("restock_orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull(), // cth: "REQ-20260401-01"
  status: text("status").notNull().default("PENDING"), // "PENDING", "APPROVED", "REJECTED"
  notes: text("notes"),
  requestedBy: text("requested_by").notNull().default("Barista Shift Pagi"),
  approvedBy: text("approved_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 3. Detail Item di Dalam Pesanan Barista ke Gudang
export const restockOrderItems = pgTable("restock_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  itemId: integer("item_id").notNull(),
  itemName: text("item_name").notNull(),
  requestedQty: integer("requested_qty").notNull(),
  approvedQty: integer("approved_qty").notNull(),
  unit: text("unit").notNull(),
});

// 4. Catatan Omzet Cafe & Penjualan (Untuk Grafik & Monitoring)
export const omzetRecords = pgTable("omzet_records", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // "YYYY-MM-DD"
  monthYear: text("month_year").notNull(), // "YYYY-MM" atau label e.g., "April 2026"
  revenue: integer("revenue").notNull(), // Total Omzet (Rp)
  cupsSold: integer("cups_sold").notNull().default(0), // Jumlah cup terjual
  kopiRevenue: integer("kopi_revenue").notNull().default(0), // Breakdown omzet Kopi
  nonKopiRevenue: integer("non_kopi_revenue").notNull().default(0), // Breakdown Non-Kopi
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 5. Purchase Order ke Supplier (Admin order bahan ke supplier, tim gudang validasi barang masuk)
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  poNumber: text("po_number").notNull(),
  status: text("status").notNull().default("ORDERED"),   // "ORDERED" | "RECEIVED" | "PARTIAL"
  orderedBy: text("ordered_by").notNull(),
  receivedBy: text("received_by"),
  notes: text("notes"),
  receiveNotes: text("receive_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  receivedAt: timestamp("received_at"),
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  poId: integer("po_id").notNull(),
  itemId: integer("item_id").notNull(),
  itemName: text("item_name").notNull(),
  unit: text("unit").notNull(),
  orderedQty: integer("ordered_qty").notNull(),
  receivedQty: integer("received_qty").notNull().default(0),
});

// 6. Settings & Konfigurasi Aplikasi (Target Omzet, dll)
export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  settingKey: text("setting_key").notNull().unique(), // cth: "MONTHLY_OMZET_TARGET"
  settingValue: text("setting_value").notNull(), // cth: "75000000"
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 7. Riwayat Aktivitas & Perubahan Stok (Audit Log)
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "TRANSFER", "ORDER_CREATE", "MANUAL_EDIT", "OMZET_ADD"
  title: text("title").notNull(),
  description: text("description").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});
