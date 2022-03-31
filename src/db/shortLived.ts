import { randomString } from "../common/utils/other";

// Session Data
export const runningSessions: Array<SessionData> = [];
export function clearSesionData() {
  runningSessions.splice(0, runningSessions.length);
}

export const phaseFinishedPlayers: Array<PhaseInstance> = [];
export function clearphaseFinishedPlayers() {
  phaseFinishedPlayers.splice(0, phaseFinishedPlayers.length);
}

export class PhaseInstance {
  phaseId: string;
  donePlayers: Array<ClientInstance>;

  constructor(phaseId: string) {
    this.phaseId = phaseId;
    this.donePlayers = [];
  }
}
export class ClientInstance {
  id: string;
  isDone: boolean;
  constructor(clientId: string) {
    this.id = clientId;
  }
}
export class SessionData {
  token: string;
  phaseId: string;
  stageCode: boolean;
  startTime: Date;

  constructor(
    token: string,
    phaseId: string,
    stageCode: boolean,
    startTime: Date | null = null
  ) {
    this.token = token;
    this.phaseId = phaseId;
    this.stageCode = stageCode;
    this.startTime = startTime === null ? new Date(Date.now()) : startTime;
  }
}

// Posted Offer
export const postedOffers: Array<PostedOffer> = [];
export function clearPO() {
  postedOffers.splice(0, postedOffers.length);
}

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

// Double Auction
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
  sellerId: string;
  price: number;

  constructor(phaseId: string, sellerId: string, price: number) {
    super(phaseId);
    this.sellerId = sellerId;
    this.price = price;
  }
}

export class BuyerBid extends DoubleAuction {
  buyerId: string;
  price: number;

  constructor(phaseId: string, buyerId: string, price: number) {
    super(phaseId);
    this.buyerId = buyerId;
    this.price = price;
  }
}

export const doubleAuctionOffers: Array<SellerBid> = [];
export const doubleAuctionBids: Array<BuyerBid> = [];
export function clearDA() {
  doubleAuctionOffers.splice(0, doubleAuctionOffers.length);
  doubleAuctionBids.splice(0, doubleAuctionBids.length);
}
export let doubleAuctionBid = 0;
export function setDoubleAuctionBid(num: number) {
  doubleAuctionBid = !isNaN(num) ? num : 0;
}
export let doubleAuctionOffer = 0;
export function setDoubleAuctionOffer(num: number) {
  doubleAuctionOffer = !isNaN(num) ? num : 0;
}

// Decentralized
export const decentralizeds: Array<Decentralized> = [];
export function clearDS() {
  decentralizeds.splice(0, decentralizeds.length);
}

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

export function consolelogshortlived() {
  console.log(runningSessions);
  console.log(postedOffers);
  console.log(doubleAuctionOffers);
  console.log(doubleAuctionBids);
  console.log(decentralizeds);
}
