export interface GuestShare {
  guestNumber: number;
  guestName: string;
  amountCents: number;
  isPrimaryPayer: boolean;
  baseCents: number;
  taxCents: number;
  tipCents: number;
  paid?: boolean;
}

export interface BillSplitResult {
  orderRef?: string;
  tableNumber?: string;
  cafeName?: string;
  currencySymbol: string;
  splitCount: number;
  totalCents: number;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  tipCents: number;
  basePerPersonCents: number;
  taxPerPersonCents: number;
  tipPerPersonCents: number;
  perPersonTotalCents: number;
  remainderCents: number;
  guestShares: GuestShare[];
  shareableSummary: string;
}

export function calculateBillSplit(params: {
  totalCents: number;
  subtotalCents?: number;
  discountCents?: number;
  taxCents?: number;
  tipCents?: number;
  splitCount: number;
  currencySymbol?: string;
  orderRef?: string;
  tableNumber?: string;
  cafeName?: string;
  guestNames?: string[];
}): BillSplitResult {
  const count = Math.max(2, Math.min(20, Math.floor(params.splitCount || 2)));
  const total = Math.max(0, Math.round(params.totalCents));
  const subtotal = Math.max(0, Math.round(params.subtotalCents || 0));
  const discount = Math.max(0, Math.round(params.discountCents || 0));
  const tax = Math.max(0, Math.round(params.taxCents || 0));
  const tip = Math.max(0, Math.round(params.tipCents || 0));
  const sym = params.currencySymbol || '$';

  const basePerPerson = Math.floor(subtotal / count);
  const taxPerPerson = Math.floor(tax / count);
  const tipPerPerson = Math.floor(tip / count);

  const basePerPersonTotal = Math.floor(total / count);
  const remainderCents = total - (basePerPersonTotal * count);

  const guestShares: GuestShare[] = [];
  for (let i = 1; i <= count; i++) {
    const isPrimary = i === 1;
    const amount = isPrimary ? basePerPersonTotal + remainderCents : basePerPersonTotal;
    const customName = params.guestNames && params.guestNames[i - 1] ? params.guestNames[i - 1] : `Guest ${i}`;
    guestShares.push({
      guestNumber: i,
      guestName: customName,
      amountCents: amount,
      isPrimaryPayer: isPrimary,
      baseCents: basePerPerson,
      taxCents: taxPerPerson,
      tipCents: tipPerPerson,
      paid: false,
    });
  }

  // Format shareable summary for WhatsApp / SMS / Slack
  const header = params.cafeName ? `☕ ${params.cafeName}` : '☕ MenuMint';
  const tableStr = params.tableNumber ? ` • ${params.tableNumber}` : '';
  const refStr = params.orderRef ? ` (Order #${params.orderRef})` : '';
  const perPersonStr = `${sym}${(basePerPersonTotal / 100).toFixed(2)}`;
  const totalStr = `${sym}${(total / 100).toFixed(2)}`;

  let summary = `${header}${tableStr}${refStr}\n`;
  summary += `Bill Split (${count} guests) • Total: ${totalStr}\n`;
  summary += `👉 Each person pays: ${perPersonStr}`;
  if (remainderCents > 0) {
    summary += ` (Guest 1 covers +${remainderCents}¢ penny rounding: ${sym}${((basePerPersonTotal + remainderCents) / 100).toFixed(2)})`;
  }
  summary += `\n\nSplit Breakdown:`;
  guestShares.forEach((g) => {
    summary += `\n- ${g.guestName}: ${sym}${(g.amountCents / 100).toFixed(2)}`;
  });
  summary += `\n\nShared via MenuMint`;

  return {
    orderRef: params.orderRef,
    tableNumber: params.tableNumber,
    cafeName: params.cafeName,
    currencySymbol: sym,
    splitCount: count,
    totalCents: total,
    subtotalCents: subtotal,
    discountCents: discount,
    taxCents: tax,
    tipCents: tip,
    basePerPersonCents: basePerPerson,
    taxPerPersonCents: taxPerPerson,
    tipPerPersonCents: tipPerPerson,
    perPersonTotalCents: basePerPersonTotal,
    remainderCents,
    guestShares,
    shareableSummary: summary,
  };
}

