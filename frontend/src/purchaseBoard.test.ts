import { describe, expect, it } from "vitest";
import { getBoardPurchases } from "./purchaseBoard";

describe("getBoardPurchases", () => {
  const today = new Date(2026, 9, 6, 12);

  it("hides received purchases older than the retention period", () => {
    const purchases = [
      { id: 1, status: "received" as const, received_date: "2026-10-04" },
      { id: 2, status: "received" as const, received_date: "2026-10-05" },
    ];

    expect(getBoardPurchases(purchases, 1, today).map(({ id }) => id)).toEqual([2]);
  });

  it("keeps purchases received in the future visible rather than treating them as old", () => {
    const purchases = [
      { id: 1, status: "received" as const, received_date: "2026-10-15" },
    ];

    expect(getBoardPurchases(purchases, 1, today)).toEqual(purchases);
  });

  it("keeps purchases in progress visible regardless of their received date", () => {
    const purchases = [
      { id: 1, status: "ordered" as const, received_date: "2026-01-01" },
    ];

    expect(getBoardPurchases(purchases, 1, today)).toEqual(purchases);
  });
});
