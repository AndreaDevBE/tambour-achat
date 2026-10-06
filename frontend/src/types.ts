export interface Supplier {
  id: number;
  name: string;
  email: string;
  phone: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  name: string;
  reference: string;
  unit: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseLine {
  id: number;
  product: number;
  product_name: string;
  quantity: string;
  unit_price: string;
  line_total: string;
}

export type PurchaseStatus = "planned" | "ordered" | "received";

export interface TechnicalSettings {
  received_purchase_retention_days: number;
}

export interface Purchase {
  id: number;
  supplier: number;
  supplier_name: string;
  status: PurchaseStatus;
  planned_date: string | null;
  ordered_date: string | null;
  received_date: string | null;
  notes: string;
  lines: PurchaseLine[];
  total: string;
  created_at: string;
  updated_at: string;
}

export type SupplierWrite = Pick<Supplier, "name" | "email" | "phone" | "notes">;
export type ProductWrite = Pick<
  Product,
  "name" | "reference" | "unit" | "description"
>;
export type PurchaseLineWrite = Pick<
  PurchaseLine,
  "product" | "quantity" | "unit_price"
>;
export type PurchaseWrite = Pick<
  Purchase,
  | "supplier"
  | "status"
  | "planned_date"
  | "ordered_date"
  | "received_date"
  | "notes"
> & { lines: PurchaseLineWrite[] };
