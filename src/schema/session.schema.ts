import { number, object, string } from "yup";

export const createSessionSchema = object({
  body: object({
    simulationID: string().uuid().required(),
    sessionType: string().required(),
    timer: number().required(),
  }),
});

export const updateSessionSchema = object({
  body: object({
    sessionType: string().required(),
    timer: number().required(),
  }),
});
