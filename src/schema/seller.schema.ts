import { number, object, string } from "yup";

export const createSellerSchema = object({
  body: object({
    simulationId: string().uuid().required(),
    loginToken: string().required(),
    unitCost: number().required(),
  }),
});
