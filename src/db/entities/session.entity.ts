import {
  Entity,
  Column,
  CreateDateColumn,
  BaseEntity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { ColumnNumericTransformer } from "../../common/utils/dbUtil";
import Phase from "./phase.entity";
import Simulation from "./simulation.entity";

@Entity("session")
export default class Session extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Simulation, (simulation) => simulation.sessions, {
    createForeignKeyConstraints: true,
    onDelete: "CASCADE",
  })
  @JoinColumn()
  simulation: Simulation;

  @OneToMany(() => Phase, (phases) => phases.session, {
    cascade: true,
  })
  phases: Phase[];

  @Column({
    type: "text",
  })
  sessionType: string;

  @Column({
    type: "numeric",
    precision: 15,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  avgTrxOccurrence: number;

  @Column({
    type: "numeric",
    precision: 15,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  avgTrxPrice: number;

  @Column({
    type: "float",
  })
  timer: number;

  @CreateDateColumn({
    type: "timestamp",
  })
  timeCreated: Date;

  @Column({
    type: "timestamp",
  })
  timeLastRun: Date;

  @Column({
    type: "boolean",
    default: false,
  })
  isRunning: boolean;

  isDone() {
    return this.timeCreated !== this.timeLastRun;
  }

  getAverageTrx() {
    throw new Error("Not implemented");
  }

  getAveragePrice() {
    throw new Error("Not implemented");
  }

  getBuyerList() {
    throw new Error("Not implemented");
  }

  getSellerList() {
    throw new Error("Not implemented");
  }

  getAllUnitCostValue() {
    throw new Error("Not implemented");
  }

  getDealPriceDiff() {
    throw new Error("Not implemented");
  }
}
