import { number, object, string } from "yup";

export const createSellerSchema = object({
  body: object({
    simulationId: string().uuid().required(),
    unitCost: number().required(),
  }),
});
