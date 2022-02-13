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
  buyer.profit += profit;
  return await buyer.save()
}


export async function inputSellerProfit(
  seller: Seller,
  profit: number,
) {
  seller.profit += profit;
  return await seller.save()
}