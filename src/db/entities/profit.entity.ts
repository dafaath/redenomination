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
import Session from "./session.entity";

@Entity("profit")
export default class Profit extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Session, (session) => session.phases, {
    createForeignKeyConstraints: true,
    onDelete: "CASCADE",
  })
  @JoinColumn()
  session: Session;

  @Column({
    type: "text",
  })
  username: string;

  @Column({
    type: "numeric",
    precision: 15,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
    default: 0,
  })
  unitCost: number;

  @Column({
    type: "numeric",
    precision: 15,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
    default: 0,
  })
  unitValue: number;

  @Column({
    type: "numeric",
    precision: 15,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
    default: 0,
  })
  price: number;

  @Column({
    type: "numeric",
    precision: 15,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
    default: 0,
  })
  profit: number;

  @CreateDateColumn({
    type: "timestamp",
  })
  timeCreated: Date;
}
