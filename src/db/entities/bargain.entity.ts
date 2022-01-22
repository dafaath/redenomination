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

  @ManyToOne(() => Phase, (phase) => phase.bargains, {
    createForeignKeyConstraints: true,
    onDelete: "CASCADE",
  })
  @JoinColumn()
  phase: Phase;

  @ManyToOne(() => Buyer, (buyer) => buyer.bargains, {
    createForeignKeyConstraints: true,
    onDelete: "CASCADE",
  })
  @JoinColumn()
  buyer: Buyer;

  @ManyToOne(() => Seller, (seller) => seller.bargains, {
    createForeignKeyConstraints: true,
    onDelete: "CASCADE",
  })
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
    type: "text",
  })
  postedBy: string;
}
