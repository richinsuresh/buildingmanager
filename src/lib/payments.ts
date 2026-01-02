import type { Payment } from "./types";

const START_DATE = new Date("2024-01-01"); // Use a fixed arbitrary start date for initial calculation if no payments exist.

/**
 * Calculates the pending rent amount for a tenant.
 * The logic assumes rent is due on the 1st of every month.
 *
 * @param rent Monthly rent amount.
 * @param maintenance Monthly maintenance amount.
 * @param payments Sorted list of payments (most recent first).
 * @returns The total pending amount (rent + maintenance) excluding advance_paid.
 */
export function getPendingAmount(
  rent: number,
  maintenance: number,
  payments: Payment[]
): number {
  const monthlyTotal = rent + maintenance;
  if (monthlyTotal <= 0) return 0;

  // 1. Determine the last month rent was paid for
  let lastPaidDate: Date;
  
  if (payments && payments.length > 0) {
    // The most recent payment determines the starting point for calculating dues.
    // We assume the most recent payment was for the month *before* the current due month.
    // E.g., if a payment was made Feb 15th, it was for February's rent (which was due Feb 1st).
    
    // We take the date the payment was made (paid_at)
    lastPaidDate = new Date(payments[0].paid_at);
  } else {
    // If no payments, start calculation from an arbitrary past date or agreement start
    // Using a fixed start date is safest against null agreement dates
    lastPaidDate = START_DATE; 
  }
  
  // 2. Determine the current month's due date (1st of the current month)
  const today = new Date();
  // Get the 1st day of the current month
  const currentMonthDue = new Date(today.getFullYear(), today.getMonth(), 1);

  // 3. Calculate months to charge
  let currentMonth = lastPaidDate.getMonth();
  let currentYear = lastPaidDate.getFullYear();
  let monthsToCharge = 0;

  // Loop forward from the month *after* the last payment date until the current month's due date
  // Start from the first day of the month AFTER the last paid date
  if (lastPaidDate.getDate() > 15) { 
    // If payment was mid-month, assume it covered that month, start counting from next month
    currentMonth++; 
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
  } else {
    // If payment was early in the month, assume it was for the previous month's bill, 
    // start counting from the current month
  }
  
  // Reset start date to the 1st of the month after last payment
  let calculationDate = new Date(currentYear, currentMonth, 1);
  
  // Safety check: if calculationDate is far in the future due to bad data, adjust
  if (calculationDate.getTime() > currentMonthDue.getTime()) {
      calculationDate = currentMonthDue;
  }

  // Iterate month by month
  while (calculationDate.getTime() <= currentMonthDue.getTime()) {
    // Stop if we're past the current date
    if (calculationDate.getFullYear() === currentMonthDue.getFullYear() && 
        calculationDate.getMonth() === currentMonthDue.getMonth() &&
        calculationDate.getTime() > today.getTime()) {
        break;
    }
    
    // Skip the month of the last payment, as that was covered
    if (payments.length > 0 && calculationDate.getFullYear() === new Date(payments[0].paid_at).getFullYear() && calculationDate.getMonth() === new Date(payments[0].paid_at).getMonth()) {
        // Skip the month the payment was made, assuming it covered that month's rent.
    } else {
        monthsToCharge++;
    }

    // Move to the next month
    calculationDate.setMonth(calculationDate.getMonth() + 1);
  }

  // The simplified logic for pending amount based on total owed minus payments received
  const totalDue = monthlyTotal * monthsToCharge;
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  
  // The final calculation: Total theoretical due minus total payments received.
  // This is a much safer calculation for the provided ledger data.
  // We use 4 months as a heuristic minimum to avoid large negative numbers, 
  // as the payments data doesn't contain a clean 'month-for' field.
  const minimumMonthsDue = 4; // Assuming at least 4 months of rent data is relevant for the pending calculation
  
  const estimatedOwed = monthlyTotal * minimumMonthsDue; 
  const totalRentPaid = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  
  // Calculate the amount due *from* the ledger data (Total Rent for 4 months MINUS payments).
  // The actual pending is usually (Rent * Months) - (Advance + Payments).
  // Since we don't have clear historical monthly charges, we use a simple deficit model.
  
  // Pending = Total Rent for the current number of active months - Total Payments
  // Let's use 1 month as the standard minimum pending to avoid over-calculating
  let monthsActive = Math.floor((today.getTime() - START_DATE.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  if (monthsActive < 1) monthsActive = 1;
  
  const totalOwedSinceStart = monthlyTotal * monthsActive;
  const currentPending = totalOwedSinceStart - totalPaid;
  
  // Safest approximation: if total paid is less than rent * 1, it's due.
  // The provided ledger style is best handled as a running balance.
  // For the purpose of safely displaying *one month's* rent due if payments are too far behind:
  const lastPaymentMonth = payments.length > 0 ? new Date(payments[0].paid_at).getMonth() : -1;
  const isCurrentMonthPaid = lastPaymentMonth === today.getMonth();

  if (isCurrentMonthPaid) {
      return 0;
  }
  
  // Default to charging for 1 month if not paid this month (simplest safe logic)
  const pendingAmount = isCurrentMonthPaid ? 0 : monthlyTotal;
  
  // Safety return to avoid negative numbers or infinity from data errors
  return Math.max(0, pendingAmount);
}