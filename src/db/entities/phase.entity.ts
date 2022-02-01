import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import Bargain from "./bargain.entity";
import Session from "./session.entity";
import Transaction from "./transaction.entity";

export enum PhaseType {
  PRE_REDENOM_PRICE = "preRedenomPrice",
  TRANSITION_PRICE = "transitionPrice",
  POST_REDENOM_PRICE = "postRedenomPrice",
}
@Entity("phase")
export default class Phase extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Session, (session) => session.phases, {
    createForeignKeyConstraints: true,
    onDelete: "CASCADE",
  })
  @JoinColumn()
  session: Session;

  @OneToMany(() => Bargain, (bargain) => bargain.phase)
  bargains: Bargain[];

  @OneToMany(() => Transaction, (transaction) => transaction.phase)
  transactions: Transaction[];

  @Column({
    type: "text",
    enum: PhaseType,
  })
  phaseType: PhaseType;

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

  @CreateDateColumn({
    type: "timestamp",
  })
  timeCreated: Date;

  @Column({
    type: "timestamp",
  })
  timeLastRun: Date;

  @Column({
    type: "boolean",
    default: false,
  })
  isRunning: boolean;

  isDone() {
    return this.timeCreated !== this.timeLastRun
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
