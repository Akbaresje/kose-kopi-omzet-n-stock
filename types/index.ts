export interface InventoryItem {
  id: number;
  name: string;
  category: "KOPI" | "POWDER" | "CUP" | "SIRUP" | string;
  unit: string;
  gudangStock: number;
  barStock: number;
  minBarStock: number;
  minGudangStock: number;
  pricePerUnit: number;
  updatedAt?: string;
}

export interface RestockOrderItem {
  id?: number;
  orderId?: number;
  itemId: number;
  itemName: string;
  requestedQty: number;
  approvedQty: number;
  unit: string;
}

export interface RestockOrder {
  id: number;
  orderNumber: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  notes?: string;
  requestedBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
  items: RestockOrderItem[];
}

export interface PurchaseOrderItem {
  id?: number;
  poId?: number;
  itemId: number;
  itemName: string;
  unit: string;
  orderedQty: number;
  receivedQty: number;
}

export interface PurchaseOrder {
  id: number;
  poNumber: string;
  status: "ORDERED" | "RECEIVED" | "PARTIAL" | string;
  orderedBy: string;
  receivedBy?: string;
  notes?: string;
  receiveNotes?: string;
  createdAt: string;
  receivedAt?: string;
  items: PurchaseOrderItem[];
}

export interface OmzetRecord {
  id: number;
  date: string;
  monthYear: string;
  revenue: number;
  cupsSold: number;
  kopiRevenue: number;
  nonKopiRevenue: number;
  notes?: string;
}

export interface ActivityLog {
  id: number;
  type: "TRANSFER" | "ORDER_CREATE" | "MANUAL_EDIT" | "OMZET_ADD" | "USAGE" | "PO_CREATE" | "PO_RECEIVE" | string;
  title: string;
  description: string;
  timestamp: string;
}

export type ActiveRole = "ADMIN" | "BARISTA" | "GUDANG";

export type TabType = 
  | "OMZET" 
  | "GUDANG" 
  | "BAR" 
  | "ORDERS" 
  | "PURCHASE_ORDERS"
  | "SHOPPING_LIST" 
  | "LOGS";
