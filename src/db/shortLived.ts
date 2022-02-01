import { randomString } from "../common/utils/other";

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