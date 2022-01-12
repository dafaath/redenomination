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

@Entity("buyer")
export default class Buyer extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToMany(() => Bargain, (bargain) => bargain.buyer)
  bargains: Bargain[];

  @OneToMany(() => Transaction, (transaction) => transaction.buyer)
  transactions: Transaction[];

  @ManyToOne(() => Simulation, (simulation) => simulation.buyers, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn()
  simulation: Simulation;

  @Column({
    type: "varchar",
  })
  loginToken: string;

  @Column({
    type: "numeric",
    precision: 15,
    scale: 2,
  })
  unitValue: number;
}