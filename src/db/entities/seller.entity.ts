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
import Simulation from "./simulation.entity";
import Transaction from "./transaction.entity";

@Entity("seller")
export default class Seller extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToMany(() => Bargain, (bargain) => bargain.seller)
  bargains: Bargain[];

  @OneToMany(() => Transaction, (transaction) => transaction.seller)
  transactions: Transaction[];

  @ManyToOne(() => Simulation, (simulation) => simulation.sellers, {
    createForeignKeyConstraints: true,
    onDelete: "CASCADE",
  })
  @JoinColumn()
  simulation: Simulation;

  @Column({
    type: "text",
  })
  loginToken: string;

  @Column({
    type: "numeric",
    precision: 15,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  unitCost: number;

  @Column({
    type: "boolean",
    default: false,
  })
  isLoggedIn: boolean;

  @Column({
    type: "boolean",
    default: false,
  })
  isReady: boolean;

  @Column({
    type: "text",
    unique: true,
    nullable: true,
  })
  socketId: string | null;

  isSold() {
    throw new Error("Not implemented");
  }
}
