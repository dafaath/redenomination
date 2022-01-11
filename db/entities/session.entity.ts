import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import Phase from "./phase.entity";
import Simulation from "./simulation.entity";

@Entity("session")
export default class Session extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Simulation, (simulation) => simulation.sessions)
  @JoinColumn()
  simulation: Simulation;

  @OneToMany(() => Phase, (phases) => phases.session)
  phases: Phase[];

  @Column({
    type: "varchar",
  })
  sessionType: string;

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
