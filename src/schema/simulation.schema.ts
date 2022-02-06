import { array, number, object, string } from "yup";
import { SimulationType } from "../db/entities/simulation.entity";

export const createSimulationSchema = object({
  body: object({
    simulationType: string().oneOf(Object.values(SimulationType)).required(),
    goodsType: string().required(),
    goodsName: string().required(),
    inflationType: string().required(),
    participantNumber: number().required(),
    simulationBudget: number().required(),
    seller: array()
      .of(
        object({
          unitCost: number().required(),
        })
      )
      .required(),
    buyer: array()
      .of(
        object({
          unitValue: number().required(),
        })
      )
      .required(),
  }),
});

export const updateSimulationSchema = object({
  body: object({
    simulationType: string().oneOf(Object.values(SimulationType)).required(),
    goodsType: string().required(),
    goodsName: string().required(),
    inflationType: string().required(),
    participantNumber: number().required(),
    simulationBudget: number().required(),
  }),
});
