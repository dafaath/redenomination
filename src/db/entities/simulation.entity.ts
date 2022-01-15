import {
  Entity,
  Column,
  BaseEntity,
  PrimaryGeneratedColumn,
  OneToMany,
} from "typeorm";
import Buyer from "./buyer.entity";
import Seller from "./seller.entity";
import Session from "./session.entity";

@Entity("simulation")
export default class Simulation extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToMany(() => Session, (session) => session.simulation)
  sessions: Session[];

  @OneToMany(() => Buyer, (buyer) => buyer.simulation)
  buyers: Buyer[];

  @OneToMany(() => Seller, (seller) => seller.simulation)
  sellers: Seller[];

  @Column({
    type: "text",
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
  })
  goodsPic: string;

  @Column({
    type: "text",
  })
  inflationType: string;

  @Column({
    type: "numeric",
    precision: 15,
    scale: 2,
  })
  avgTrxOccurrence: number;

  @Column({
    type: "numeric",
    precision: 15,
    scale: 2,
  })
  avgTrxPrice: number;

  @Column({
    type: "float",
  })
  timer: number;

  @Column({
    type: "timestamp",
  })
  timeCreated: Date;

  @Column({
    type: "timestamp",
  })
  timeStart: Date;

  @Column({
    type: "timestamp",
  })
  timeFinish: Date;

  isDone() {
    throw new Error("Not implemented");
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
