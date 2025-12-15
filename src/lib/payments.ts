import type { Payment } from "./types";

export function getPendingAmount(
  rent: number,
  maintenance: number,
  payments: Payment[]
): number {
  const monthlyTotal = rent + maintenance;
  const now = new Date();

  const paidThisMonth = payments.reduce((sum, p) => {
    const d = new Date(p.paid_at);
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
      return sum + p.amount;
    }
    return sum;
  }, 0);

  return Math.max(monthlyTotal - paidThisMonth, 0);
}
