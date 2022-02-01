import { randomString } from "../common/utils/other";
import Buyer from "./entities/buyer.entity";

export const postedOffers: Array<PostedOffer> = [];

export class PostedOffer {
  id: string;
  sellerId: string;
  isSold: boolean;
  buyerId: string | null;
  phaseId: string;
  price: number;
  timeCreated: Date;

  constructor(sellerId: string, price: number, phaseId: string) {
    this.sellerId = sellerId;
    this.price = price;
    this.phaseId = phaseId;

    this.id = randomString(16);
    this.isSold = false;
    this.buyerId = null;
    this.timeCreated = new Date(Date.now());
  }
}

export const profitCollection: Array<Profit> = [];

export class Profit {
  socketId: string;
  value: number;

  constructor(socketId: string, value: number) {
    this.socketId = socketId;
    this.value = value;
  }
}

export const doubleAuctions: Array<DoubleAuction> = [];

export class DoubleAuction {
  id: string;
  sellerId: string;
  isSold: boolean;
  buyerId: string | null;
  phaseId: string;
  minimumPrice: number;
  timeCreated: Date;
  offers: Array<{
    id: string;
    buyerId: string;
    bidPrice: number | null;
  }>;

  constructor(
    sellerId: string,
    minimumPrice: number,
    phaseId: string,
    buyers: Buyer[]
  ) {
    this.sellerId = sellerId;
    this.minimumPrice = minimumPrice;
    this.phaseId = phaseId;

    this.id = randomString(32);
    this.isSold = false;
    this.buyerId = null;
    this.timeCreated = new Date(Date.now());
    this.offers = buyers.map((b) => {
      return {
        id: randomString(32),
        buyerId: b.id,
        bidPrice: null,
      };
    });
  }
}
