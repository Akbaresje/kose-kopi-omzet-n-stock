import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryItems, restockOrders, restockOrderItems, omzetRecords, activityLogs, purchaseOrders, purchaseOrderItems, appSettings } from "@/db/schema";
import { checkAndSeedDatabase } from "@/db/seed";
import { eq, sql } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, payload } = body;

    // 1. Barista membuat permintaan order ke Gudang
    if (action === "SUBMIT_ORDER") {
      const { items, notes, requestedBy } = payload;
      if (!items || items.length === 0) {
        return NextResponse.json({ status: "error", message: "Pilih minimal 1 item untuk dipesan" }, { status: 400 });
      }

      const orderNum = `REQ-${new Date().toISOString().slice(2,10).replace(/-/g,"")}-${Math.floor(100 + Math.random() * 900)}`;

      const [newOrder] = await db.insert(restockOrders).values({
        orderNumber: orderNum,
        status: "PENDING",
        notes: notes || "Permintaan penambahan stok dari Bar",
        requestedBy: requestedBy || "Barista Shift Pagi",
      }).returning();

      const itemsToInsert = items.map((i: any) => ({
        orderId: newOrder.id,
        itemId: i.itemId,
        itemName: i.itemName,
        requestedQty: Number(i.requestedQty),
        approvedQty: Number(i.requestedQty),
        unit: i.unit,
      }));

      await db.insert(restockOrderItems).values(itemsToInsert);

      await db.insert(activityLogs).values({
        type: "ORDER_CREATE",
        title: `Permintaan Baru #${orderNum}`,
        description: `${requestedBy || "Barista"} meminta ${items.length} jenis bahan baku dari Gudang.`,
      });

      return NextResponse.json({ status: "success", message: `Order #${orderNum} berhasil dikirim ke Gudang!`, order: newOrder });
    }

    // 2. Admin / Gudang menyetujui (Approve) pesanan & transfer stok dari Gudang ke Bar
    if (action === "APPROVE_ORDER") {
      const { orderId, approvedBy } = payload;
      
      const orderItems = await db.select().from(restockOrderItems).where(eq(restockOrderItems.orderId, orderId));
      if (orderItems.length === 0) {
        return NextResponse.json({ status: "error", message: "Detail pesanan tidak ditemukan" }, { status: 404 });
      }

      // Process stock updates
      for (const item of orderItems) {
        const [current] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, item.itemId));
        if (current) {
          const qty = item.approvedQty || item.requestedQty;
          // Kalau stok di gudang tidak cukup, kurangi semaksimal yang ada di gudang (atau kurangi)
          const actualTransfer = Math.min(current.gudangStock, qty);
          
          if (actualTransfer > 0) {
            await db.update(inventoryItems)
              .set({ 
                gudangStock: Math.max(0, current.gudangStock - actualTransfer),
                barStock: current.barStock + actualTransfer,
                updatedAt: new Date() 
              })
              .where(eq(inventoryItems.id, current.id));
          } else {
            // Kalau Gudang juga 0, kita tetap catat perpindahan 0
          }
        }
      }

      // Update order status
      await db.update(restockOrders)
        .set({ status: "APPROVED", approvedBy: approvedBy || "Admin Gudang", updatedAt: new Date() })
        .where(eq(restockOrders.id, orderId));

      const [order] = await db.select().from(restockOrders).where(eq(restockOrders.id, orderId));

      await db.insert(activityLogs).values({
        type: "TRANSFER",
        title: `Stok Dikirim #${order?.orderNumber || orderId}`,
        description: `Gudang telah menyetujui pengiriman barang ke area Barista.`,
      });

      return NextResponse.json({ status: "success", message: "Pesanan disetujui! Stok Gudang otomatis berkurang dan Stok Bar bertambah." });
    }

    // 3. Tolak pesanan
    if (action === "REJECT_ORDER") {
      const { orderId, notes } = payload;
      await db.update(restockOrders)
        .set({ status: "REJECTED", notes: notes || "Ditolak oleh Gudang (Stok Tidak Mencukupi)", updatedAt: new Date() })
        .where(eq(restockOrders.id, orderId));

      await db.insert(activityLogs).values({
        type: "ORDER_CREATE",
        title: `Pesanan Ditolak #${orderId}`,
        description: `Pesanan dari Bar ditolak oleh admin Gudang.`,
      });

      return NextResponse.json({ status: "success", message: "Pesanan telah ditolak." });
    }

    // 3b. BARISTA: Pakai Bahan Baku di Bar (stok bar otomatis berkurang)
    if (action === "USE_STOCK") {
      const { itemId, qty, usedBy, reason } = payload;
      const useQty = Math.max(1, Number(qty) || 1);

      const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, itemId));
      if (!item) {
        return NextResponse.json({ status: "error", message: "Bahan baku tidak ditemukan" }, { status: 404 });
      }

      if (item.barStock <= 0) {
        return NextResponse.json({
          status: "error",
          message: `Stok ${item.name} di Bar sudah 0. Silakan ajukan order ke Gudang terlebih dahulu.`
        }, { status: 400 });
      }

      const actualUsed = Math.min(item.barStock, useQty);
      const newBarStock = item.barStock - actualUsed;

      await db.update(inventoryItems)
        .set({ barStock: newBarStock, updatedAt: new Date() })
        .where(eq(inventoryItems.id, itemId));

      await db.insert(activityLogs).values({
        type: "USAGE",
        title: `Pemakaian Bar: ${item.name}`,
        description: `${usedBy || "Barista"} memakai ${actualUsed} ${item.unit} ${item.name}${reason ? ` (${reason})` : ""}. Sisa stok di Bar: ${newBarStock} ${item.unit}.`,
      });

      return NextResponse.json({
        status: "success",
        message: `${item.name} berkurang ${actualUsed} ${item.unit}. Sisa ${newBarStock} ${item.unit} di Bar.`,
        remaining: newBarStock,
        isEmpty: newBarStock === 0,
      });
    }

    // 3c. BARISTA: Koreksi / Set Langsung Jumlah Stok di Bar
    if (action === "SET_BAR_STOCK") {
      const { itemId, barStock, updatedBy, notes } = payload;
      const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, itemId));
      if (!item) {
        return NextResponse.json({ status: "error", message: "Bahan baku tidak ditemukan" }, { status: 404 });
      }

      const newStock = Math.max(0, Number(barStock));
      const diff = newStock - item.barStock;

      await db.update(inventoryItems)
        .set({ barStock: newStock, updatedAt: new Date() })
        .where(eq(inventoryItems.id, itemId));

      await db.insert(activityLogs).values({
        type: "USAGE",
        title: `Update Stok Bar: ${item.name}`,
        description: `${updatedBy || "Barista"} memperbarui stok Bar dari ${item.barStock} → ${newStock} ${item.unit} (${diff >= 0 ? "+" : ""}${diff}).${notes ? ` Catatan: ${notes}` : ""}`,
      });

      return NextResponse.json({
        status: "success",
        message: `Stok Bar ${item.name} berhasil diperbarui menjadi ${newStock} ${item.unit}.`,
        remaining: newStock,
        isEmpty: newStock === 0,
      });
    }

    // 4. Kelola Stok & Harga Bahan Baku (Gudang / Admin)
    if (action === "ADJUST_STOCK") {
      const { itemId, gudangStock, barStock, pricePerUnit, notes } = payload;
      const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, itemId));
      if (!item) {
        return NextResponse.json({ status: "error", message: "Item tidak ditemukan" }, { status: 404 });
      }

      const newGudang = gudangStock !== undefined ? Number(gudangStock) : item.gudangStock;
      const newBar = barStock !== undefined ? Number(barStock) : item.barStock;
      const newPrice = pricePerUnit !== undefined ? Number(pricePerUnit) : item.pricePerUnit;
      
      const priceChanged = newPrice !== item.pricePerUnit;
      const stockChanged = newGudang !== item.gudangStock || newBar !== item.barStock;

      await db.update(inventoryItems)
        .set({ 
          gudangStock: newGudang,
          barStock: newBar,
          pricePerUnit: newPrice,
          updatedAt: new Date() 
        })
        .where(eq(inventoryItems.id, itemId));

      const formatRp = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
      
      let title = `Opname Stok & Harga: ${item.name}`;
      if (priceChanged && !stockChanged) {
        title = `Update Harga Bahan: ${item.name}`;
      } else if (stockChanged && !priceChanged) {
        title = `Opname Stok: ${item.name}`;
      }

      const descParts = [];
      if (stockChanged) descParts.push(`Stok Gudang: ${newGudang} ${item.unit}, Bar: ${newBar} ${item.unit}`);
      if (priceChanged) descParts.push(`Harga berubah dari ${formatRp(item.pricePerUnit)} menjadi ${formatRp(newPrice)}/${item.unit}`);
      
      await db.insert(activityLogs).values({
        type: "MANUAL_EDIT",
        title,
        description: notes || descParts.join(" • ") || `Pembaharuan data inventaris ${item.name}`,
      });

      return NextResponse.json({ status: "success", message: `Data ${item.name} berhasil diperbarui!` });
    }

    // 5. Tambah Item Bahan Baku Baru ke Gudang/Bar
    if (action === "ADD_NEW_ITEM") {
      const { name, category, unit, gudangStock, barStock, minBarStock, pricePerUnit } = payload;
      
      const [newItem] = await db.insert(inventoryItems).values({
        name,
        category,
        unit: unit || "Pack",
        gudangStock: Number(gudangStock || 0),
        barStock: Number(barStock || 0),
        minBarStock: Number(minBarStock || 2),
        pricePerUnit: Number(pricePerUnit || 100000)
      }).returning();

      await db.insert(activityLogs).values({
        type: "MANUAL_EDIT",
        title: `Item Baru Ditambahkan`,
        description: `${name} (${category}) kini terdaftar dengan stok awal Gudang: ${gudangStock}, Bar: ${barStock}`,
      });

      return NextResponse.json({ status: "success", message: `${name} berhasil ditambahkan ke inventaris KOSE!`, item: newItem });
    }

    // 6. Catat Omzet Harian
    if (action === "ADD_OMZET") {
      const { date, revenue, cupsSold, kopiRevenue, nonKopiRevenue, notes } = payload;
      const dateObj = new Date(date);
      const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
      const monthYear = `${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

      // Cek apakah tanggal ini sudah ada, jika ada kita perbarui
      const [existing] = await db.select().from(omzetRecords).where(eq(omzetRecords.date, date));
      if (existing) {
        await db.update(omzetRecords).set({
          revenue: Number(revenue),
          cupsSold: Number(cupsSold),
          kopiRevenue: Number(kopiRevenue || Math.round(Number(revenue) * 0.65)),
          nonKopiRevenue: Number(nonKopiRevenue || Math.round(Number(revenue) * 0.35)),
          notes: notes || "Diperbarui via POS Online KOSE",
        }).where(eq(omzetRecords.id, existing.id));
      } else {
        await db.insert(omzetRecords).values({
          date,
          monthYear,
          revenue: Number(revenue),
          cupsSold: Number(cupsSold),
          kopiRevenue: Number(kopiRevenue || Math.round(Number(revenue) * 0.65)),
          nonKopiRevenue: Number(nonKopiRevenue || Math.round(Number(revenue) * 0.35)),
          notes: notes || "Pemasukan hari ini terinput",
        });
      }

      await db.insert(activityLogs).values({
        type: "OMZET_ADD",
        title: `Catatan Omzet ${date}`,
        description: `Pemasukan Rp ${Number(revenue).toLocaleString("id-ID")} dengan total ${cupsSold} porsi/cup terjual.`,
      });

      return NextResponse.json({ status: "success", message: `Omzet tanggal ${date} berhasil dicatat!` });
    }

    // 7. Order Cepat Otomatis (Semua Stok Bar yang Habis / Tipis)
    if (action === "QUICK_ORDER_HABIS") {
      const items = await db.select().from(inventoryItems);
      // Cari yang barStock <= minBarStock DAN di gudang tersedia stok (>0)
      const needsRestock = items.filter(i => i.barStock === 0 && i.gudangStock > 0);
      
      if (needsRestock.length === 0) {
        return NextResponse.json({ status: "info", message: "Tidak ada item berstok nol di Bar yang memiliki sedia di Gudang." });
      }

      const orderNum = `REQ-AUTO-${Math.floor(1000 + Math.random() * 9000)}`;
      const [newOrder] = await db.insert(restockOrders).values({
        orderNumber: orderNum,
        status: "PENDING",
        notes: `[ORDER DARURAT OTOMATIS] Request transfer untuk ${needsRestock.length} bahan baku yang ludes di Bar!`,
        requestedBy: "Barista (Quick Order System)",
      }).returning();

      const orderItemsData = needsRestock.map(i => ({
        orderId: newOrder.id,
        itemId: i.id,
        itemName: i.name,
        requestedQty: Math.min(i.gudangStock, 3), // Minta 3 pack/botol atau semaksimal sisa gudang
        approvedQty: Math.min(i.gudangStock, 3),
        unit: i.unit,
      }));

      await db.insert(restockOrderItems).values(orderItemsData);

      await db.insert(activityLogs).values({
        type: "ORDER_CREATE",
        title: `Order Cepat #${orderNum}`,
        description: `Barista menekan Order Cepat untuk ${needsRestock.length} varian yang ludes di meja Bar.`,
      });

      return NextResponse.json({ status: "success", message: `Permintaan Order Cepat untuk ${needsRestock.length} item berhasil dikirim ke Gudang!` });
    }

    // 8. ADMIN: Buat Purchase Order ke Supplier
    if (action === "CREATE_PO") {
      const { items: poItemsPayload, notes, orderedBy } = payload;
      if (!poItemsPayload || poItemsPayload.length === 0) {
        return NextResponse.json({ status: "error", message: "Pilih minimal 1 item untuk dipesan ke supplier" }, { status: 400 });
      }

      const poNum = `PO-${new Date().toISOString().slice(2,10).replace(/-/g,"")}-${Math.floor(100 + Math.random() * 900)}`;

      const [newPO] = await db.insert(purchaseOrders).values({
        poNumber: poNum,
        status: "ORDERED",
        orderedBy: orderedBy || "Admin / Owner",
        notes: notes || "Pemesanan bahan baku ke supplier",
      }).returning();

      const itemsToInsert = poItemsPayload.map((i: any) => ({
        poId: newPO.id,
        itemId: Number(i.itemId),
        itemName: i.itemName,
        unit: i.unit,
        orderedQty: Number(i.orderedQty),
        receivedQty: 0,
      }));

      await db.insert(purchaseOrderItems).values(itemsToInsert);

      await db.insert(activityLogs).values({
        type: "PO_CREATE",
        title: `Order Supplier #${poNum}`,
        description: `${orderedBy || "Admin"} memesan ${poItemsPayload.length} jenis bahan baku ke supplier.${notes ? ` Catatan: ${notes}` : ""}`,
      });

      return NextResponse.json({ status: "success", message: `Purchase Order #${poNum} berhasil dibuat! Tim gudang akan memvalidasi saat barang tiba.` });
    }

    // 9. TIM GUDANG: Validasi Barang Masuk (Terima PO)
    if (action === "RECEIVE_PO") {
      const { poId, receivedItems, receivedBy, receiveNotes } = payload;

      const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId));
      if (!po) {
        return NextResponse.json({ status: "error", message: "Purchase Order tidak ditemukan" }, { status: 404 });
      }
      if (po.status === "RECEIVED") {
        return NextResponse.json({ status: "error", message: "PO ini sudah diterima sebelumnya." }, { status: 400 });
      }

      let allFullyReceived = true;

      for (const ri of receivedItems) {
        const recQty = Math.max(0, Number(ri.receivedQty));

        // Update received qty di PO item
        await db.update(purchaseOrderItems)
          .set({ receivedQty: recQty })
          .where(eq(purchaseOrderItems.id, Number(ri.poItemId)));

        // Tambahkan stok gudang sesuai jumlah yang diterima
        if (recQty > 0) {
          const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, Number(ri.itemId)));
          if (item) {
            await db.update(inventoryItems)
              .set({ gudangStock: item.gudangStock + recQty, updatedAt: new Date() })
              .where(eq(inventoryItems.id, item.id));
          }
        }

        // Cek apakah ada yang diterima kurang dari yang dipesan
        if (recQty < Number(ri.orderedQty)) {
          allFullyReceived = false;
        }
      }

      const newStatus = allFullyReceived ? "RECEIVED" : "PARTIAL";

      await db.update(purchaseOrders)
        .set({
          status: newStatus,
          receivedBy: receivedBy || "Tim Gudang",
          receiveNotes: receiveNotes || undefined,
          receivedAt: new Date(),
        })
        .where(eq(purchaseOrders.id, poId));

      await db.insert(activityLogs).values({
        type: "PO_RECEIVE",
        title: `Barang Masuk #${po.poNumber} — ${newStatus === "RECEIVED" ? "Lengkap" : "Sebagian"}`,
        description: `${receivedBy || "Tim Gudang"} memvalidasi penerimaan barang dari supplier. Status: ${newStatus === "RECEIVED" ? "Semua diterima lengkap" : "Diterima sebagian (ada selisih)"}.${receiveNotes ? ` Catatan: ${receiveNotes}` : ""} Stok gudang otomatis bertambah.`,
      });

      return NextResponse.json({
        status: "success",
        message: newStatus === "RECEIVED"
          ? `Semua barang PO #${po.poNumber} diterima lengkap! Stok gudang sudah bertambah otomatis.`
          : `Barang PO #${po.poNumber} diterima sebagian. Stok gudang sudah bertambah sesuai jumlah yang masuk.`
      });
    }

    // 10. Update Settings (Target Omzet, dll)
    if (action === "UPDATE_SETTING") {
      const { settingKey, settingValue } = payload;
      if (!settingKey || settingValue === undefined) {
        return NextResponse.json({ status: "error", message: "Key dan value wajib diisi" }, { status: 400 });
      }

      const [existing] = await db.select().from(appSettings).where(eq(appSettings.settingKey, settingKey));
      
      if (existing) {
        await db.update(appSettings)
          .set({ settingValue, updatedAt: new Date() })
          .where(eq(appSettings.settingKey, settingKey));
      } else {
        await db.insert(appSettings).values({ settingKey, settingValue });
      }

      await db.insert(activityLogs).values({
        type: "MANUAL_EDIT",
        title: `Update Pengaturan: ${settingKey}`,
        description: `Nilai ${settingKey} diubah menjadi ${settingValue}.`,
      });

      return NextResponse.json({ status: "success", message: "Pengaturan berhasil disimpan!" });
    }

    // 11. Reset Omzet Bulanan (Hapus omzet pada bulan tertentu)
    if (action === "RESET_MONTHLY_OMZET") {
      const { monthYear } = payload;
      if (!monthYear) {
        return NextResponse.json({ status: "error", message: "Bulan dan tahun wajib dipilih" }, { status: 400 });
      }

      await db.delete(omzetRecords).where(eq(omzetRecords.monthYear, monthYear));

      await db.insert(activityLogs).values({
        type: "OMZET_ADD",
        title: `Reset Omzet Bulanan: ${monthYear}`,
        description: `Semua catatan omzet untuk bulan ${monthYear} telah direset/dihapus.`,
      });

      return NextResponse.json({ status: "success", message: `Data omzet bulan ${monthYear} berhasil direset!` });
    }

    // 12. Reset Data Pembuktian
    if (action === "RESET_DB") {
      await db.delete(purchaseOrderItems);
      await db.delete(purchaseOrders);
      await db.delete(restockOrderItems);
      await db.delete(restockOrders);
      await db.delete(omzetRecords);
      await db.delete(activityLogs);
      await db.delete(inventoryItems);
      await db.delete(appSettings);
      await checkAndSeedDatabase();
      // Re-insert default settings
      await db.insert(appSettings).values({ settingKey: "MONTHLY_OMZET_TARGET", settingValue: "75000000" });
      return NextResponse.json({ status: "success", message: "Database berhasil direset ke data bawaan KOSE Cafe!" });
    }

    return NextResponse.json({ status: "error", message: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Action Error:", error);
    return NextResponse.json(
      { status: "error", message: error?.message || "Internal server error during action" },
      { status: 500 }
    );
  }
}
