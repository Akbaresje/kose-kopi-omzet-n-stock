import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryItems, restockOrders, restockOrderItems, omzetRecords, activityLogs, purchaseOrders, purchaseOrderItems, appSettings } from "@/db/schema";
import { checkAndSeedDatabase } from "@/db/seed";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    await checkAndSeedDatabase();

    const items = await db.select().from(inventoryItems).orderBy(inventoryItems.category, inventoryItems.name);

    const orders = await db.select().from(restockOrders).orderBy(desc(restockOrders.createdAt));
    const orderItems = await db.select().from(restockOrderItems);
    const ordersWithItems = orders.map(order => ({
      ...order,
      items: orderItems.filter(item => item.orderId === order.id)
    }));

    // Purchase Orders ke Supplier
    const pos = await db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt));
    const poItems = await db.select().from(purchaseOrderItems);
    const posWithItems = pos.map(po => ({
      ...po,
      items: poItems.filter(item => item.poId === po.id)
    }));

    const omzet = await db.select().from(omzetRecords).orderBy(omzetRecords.date);
    const logs = await db.select().from(activityLogs).orderBy(desc(activityLogs.timestamp)).limit(30);
    
    // Fetch settings
    const settingsRows = await db.select().from(appSettings);
    const settings: Record<string, string> = {};
    settingsRows.forEach(s => { settings[s.settingKey] = s.settingValue; });

    return NextResponse.json({
      items,
      orders: ordersWithItems,
      purchaseOrders: posWithItems,
      omzet,
      logs,
      settings,
      status: "success"
    });
  } catch (error: any) {
    console.error("Error fetching KOSE Cafe data:", error);
    return NextResponse.json(
      { status: "error", message: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
