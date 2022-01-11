import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import Bargain from "./bargain.entity";
import Simulation from "./simulation.entity";
import Transaction from "./transaction.entity";

@Entity("seller")
export default class Seller extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToMany(() => Bargain, (bargain) => bargain.seller)
  bargains: Bargain[];

  @ManyToOne(() => Simulation, (simulation) => simulation.sellers)
  @JoinColumn()
  simulation: Simulation;

  @OneToMany(() => Transaction, (transaction) => transaction.seller)
  transactions: Transaction[];

  @Column({
    type: "varchar",
  })
  loginToken: string;

  @Column({
    type: "numeric",
    precision: 15,
    scale: 2,
  })
  unitCost: number;

  @Column({
    type: "numeric",
    precision: 15,
    scale: 2,
  })
  pricePreRedenom: number;

  @Column({
    type: "numeric",
    precision: 15,
    scale: 2,
  })
  priceRedenom: number;

  @Column({
    type: "numeric",
    precision: 15,
    scale: 2,
  })
  pricePostRedenom: number;
}
