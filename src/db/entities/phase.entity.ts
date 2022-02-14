import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ColumnNumericTransformer } from "../../common/utils/dbUtil";
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
    type: "enum",
    enum: PhaseType,
  })
  phaseType: PhaseType;

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
  timer: number;

  @Column({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  timeCreated: Date;

  @Column({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  timeLastRun: Date;

  @Column({
    type: "boolean",
    default: false,
  })
  isRunning: boolean;

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
