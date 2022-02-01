import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ColumnNumericTransformer } from "../../common/utils/dbUtil";
import Buyer from "./buyer.entity";
import Phase from "./phase.entity";
import Seller from "./seller.entity";

@Entity("transaction")
export default class Transaction extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Phase, (phase) => phase.bargains, {
    createForeignKeyConstraints: true,
    onDelete: "CASCADE",
  })
  @JoinColumn()
  phase: Phase;

  @ManyToOne(() => Buyer, (buyer) => buyer.transactions, {
    createForeignKeyConstraints: true,
    onDelete: "CASCADE",
  })
  @JoinColumn()
  buyer: Buyer;

  @ManyToOne(() => Seller, (seller) => seller.transactions, {
    createForeignKeyConstraints: true,
    onDelete: "CASCADE",
  })
  @JoinColumn()
  seller: Seller;

  @Column({
    type: "numeric",
    precision: 15,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  price: number;

  @CreateDateColumn()
  timeCreated: Date;
}
