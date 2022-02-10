import Buyer from "../../db/entities/buyer.entity";
import Seller from "../../db/entities/seller.entity";

export class ColumnNumericTransformer {
  to(data: number): number {
    return data;
  }
  from(data: string): number {
    return parseFloat(data);
  }
}

export async function inputBuyerProfit(
  buyer: Buyer,
  profit: number,
) {
  if (buyer.profit !== null) {
    if (buyer.profit > 0) {
      buyer.profit += profit;
    } else {
      buyer.profit = profit;
    }
  } else {
    console.log("PO buyer profit input is null");
  }

  return await buyer.save()
}


export async function inputSellerProfit(
  seller: Seller,
  profit: number,
) {
  if (seller.profit !== null) {
    if (seller.profit > 0) {
      seller.profit += profit;
    } else {
      seller.profit = profit;
    }
  } else {
    console.log("PO seller profit input is null");
  }

  return await seller.save()
}