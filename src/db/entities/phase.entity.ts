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

@Entity("phase")
export default class Phase extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Session, (session) => session.phases, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn()
  session: Session;

  @OneToMany(() => Bargain, (bargain) => bargain.phase)
  bargains: Bargain[];

  @OneToMany(() => Transaction, (transaction) => transaction.phase)
  transactions: Transaction[];

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

  @CreateDateColumn({
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
}