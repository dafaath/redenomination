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

export const doubleAuctionSellerBid: Array<SellerBid> = [];
export const doubleAuctionBuyerBid: Array<BuyerBid> = [];

class DoubleAuction {
  id: string;
  phaseId: string;
  timeCreated: Date;

  constructor(phaseId: string) {
    this.phaseId = phaseId;

    this.id = randomString(32);
    this.timeCreated = new Date(Date.now());
  }
}

export class SellerBid extends DoubleAuction {
  sellerBid: {
    sellerId: string;
    price: number;
  };

  constructor(phaseId: string, sellerId: string, price: number) {
    super(phaseId);
    this.sellerBid = {
      sellerId: sellerId,
      price: price,
    };
  }
}

export class BuyerBid extends DoubleAuction {
  buyerBid: {
    buyerId: string;
    price: number;
  };
  constructor(phaseId: string, buyerId: string, price: number) {
    super(phaseId);
    this.buyerBid = {
      buyerId: buyerId,
      price: price,
    };
  }
}

export const decentralizeds: Array<Decentralized> = [];

export class Decentralized {
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
