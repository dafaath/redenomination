import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import Buyer from "./buyer.entity";
import Phase from "./phase.entity";
import Seller from "./seller.entity";

@Entity("transaction")
export default class Transaction extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Phase, (phase) => phase.bargains)
  @JoinColumn()
  phase: Phase;

  @ManyToOne(() => Buyer, (buyer) => buyer.transactions)
  @JoinColumn()
  buyer: Buyer;

  @ManyToOne(() => Seller, (seller) => seller.transactions)
  @JoinColumn()
  seller: Seller;

  @Column({
    type: "numeric",
    precision: 15,
    scale: 2,
  })
  price: number;

  @CreateDateColumn()
  timeCreated: Date;
}
