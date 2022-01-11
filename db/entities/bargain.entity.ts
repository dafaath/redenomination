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

@Entity("bargain")
export default class Bargain extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Phase, (phase) => phase.bargains)
  @JoinColumn()
  phase: Phase;

  @ManyToOne(() => Buyer, (buyer) => buyer.bargains)
  @JoinColumn()
  buyer: Buyer;

  @ManyToOne(() => Seller, (seller) => seller.bargains)
  @JoinColumn()
  seller: Seller;

  @Column({
    type: "numeric",
    precision: 15,
    scale: 2,
  })
  price: number;

  @CreateDateColumn({
    type: "timestamp",
  })
  timeCreated: Date;

  @Column({
    type: "varchar",
  })
  postedBy: string;
}
