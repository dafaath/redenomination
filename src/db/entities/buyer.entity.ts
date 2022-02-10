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

@Entity("buyer")
export default class Buyer extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToMany(() => Bargain, (bargain) => bargain.buyer)
  bargains: Bargain[];

  @OneToMany(() => Transaction, (transaction) => transaction.buyer)
  transactions: Transaction[];

  @ManyToOne(() => Simulation, (simulation) => simulation.buyers, {
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
    type: "text",
    unique: true,
  })
  username: string;

  @Column({
    type: "numeric",
    precision: 15,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
    default: 0,
  })
  profit: number;

  @Column({
    type: "numeric",
    precision: 15,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  unitValue: number;

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

  hasBought() {
    throw new Error("Not implemented");
  }
}
