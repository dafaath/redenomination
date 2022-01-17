import { number, object, string } from "yup";

export const createBuyerSchema = object({
  body: object({
    simulationId: string().uuid().required(),
    unitValue: number().required(),
  }),
});

export const updateBuyerSchema = object({
  body: object({
    unitValue: number().required(),
  }),
});
