import { randomString } from "../common/utils/other";

export const postedOffers: Array<PostedOffer> = [];

export class PostedOffer {
  id: string;
  sellerId: string;
  isSold: boolean;
  buyerId: string | null;
  price: number;
  timeCreated: Date;

  constructor(sellerId: string, price: number) {
    this.sellerId = sellerId;
    this.price = price;

    this.id = randomString(16);
    this.isSold = false;
    this.buyerId = null;
    this.timeCreated = new Date(Date.now());
  }
}
