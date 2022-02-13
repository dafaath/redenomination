import {
  Entity,
  Column,
  BaseEntity,
  PrimaryGeneratedColumn,
  OneToMany,
} from "typeorm";
import { ColumnNumericTransformer } from "../../common/utils/dbUtil";
import Buyer from "./buyer.entity";
import Seller from "./seller.entity";
import Session from "./session.entity";

export enum SimulationType {
  POSTED_OFFER = "posted offer",
  DOUBLE_AUCTION = "double auction",
  DECENTRALIZED = "decentralized",
}

@Entity("simulation")
export default class Simulation extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToMany(() => Session, (session) => session.simulation, {
    cascade: true,
    onDelete: "CASCADE",
  })
  sessions: Session[];

  @OneToMany(() => Buyer, (buyer) => buyer.simulation, {
    cascade: true,
  })
  buyers: Buyer[];

  @OneToMany(() => Seller, (seller) => seller.simulation, {
    cascade: true,
  })
  sellers: Seller[];

  @Column({
    type: "varchar",
    length: 32,
    unique: true,
  })
  token: string;

  @Column({
    type: "text",
  })
  simulationType: string;

  @Column({
    type: "text",
  })
  goodsType: string;

  @Column({
    type: "text",
  })
  goodsName: string;

  @Column({
    type: "text",
    nullable: true,
  })
  goodsPic: string;

  @Column({
    type: "text",
  })
  inflationType: string;

  @Column({
    type: "int",
  })
  participantNumber: number;

  @Column({
    type: "numeric",
    precision: 15,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  avgTrxOccurrence: number;

  @Column({
    type: "numeric",
    precision: 15,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  avgTrxPrice: number;

  @Column({
    type: "float",
  })
  simulationBudget: number;

  @Column({
    type: "timestamp",
  })
  timeCreated: Date;

  @Column({
    type: "timestamp",
  })
  timeLastRun: Date;

  isDone() {
    return this.timeCreated !== this.timeLastRun;
  }

  getAverageTrx() {
    throw new Error("Not implemented");
  }

  getAveragePrice() {
    throw new Error("Not implemented");
  }

  getBuyerList() {
    throw new Error("Not implemented");
  }

  getSellerList() {
    throw new Error("Not implemented");
  }

  getAllUnitCostValue() {
    throw new Error("Not implemented");
  }

  getDealPriceDiff() {
    throw new Error("Not implemented");
  }
}
