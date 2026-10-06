import type { PurchaseStatus } from "./types";

interface PurchaseBoardItem {
  status: PurchaseStatus;
  received_date: string | null;
}

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getBoardPurchases<T extends PurchaseBoardItem>(
  purchases: T[],
  retentionDays: number,
  today: Date = new Date(),
): T[] {
  const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffDate = localDateString(cutoff);
  return purchases.filter(
    (purchase) =>
      purchase.status !== "received" ||
      !purchase.received_date ||
      purchase.received_date >= cutoffDate,
  );
}
