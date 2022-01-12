import {
  Entity,
  Column,
  BaseEntity,
  PrimaryGeneratedColumn,
  OneToMany,
} from "typeorm";
import Buyer from "./buyer.entity";
import Seller from "./seller.entity";
import Session from "./session.entity";

@Entity("simulation")
export default class Simulation extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: "varchar",
  })
  simulationType: string;

  @Column({
    type: "varchar",
  })
  goodsType: string;

  @Column({
    type: "varchar",
  })
  inflationType: string;

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

  @Column({
    type: "float",
  })
  timer: number;

  @Column({
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

  @OneToMany(() => Session, (session) => session.simulation)
  sessions: Session[];

  @OneToMany(() => Buyer, (buyer) => buyer.simulation)
  buyers: Buyer[];

  @OneToMany(() => Seller, (seller) => seller.simulation)
  sellers: Seller[];
}
