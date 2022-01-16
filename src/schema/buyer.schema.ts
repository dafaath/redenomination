import { number, object, string } from "yup";

export const createBuyerSchema = object({
  body: object({
    simulationId: string().uuid().required(),
    loginToken: string().required(),
    unitValue: number().required(),
  }),
});
