import { object, string } from "yup";

export const phaseIdSchema = object({
  phaseId: string().uuid().required(),
})
  .noUnknown(true)
  .required()
  .strict();

export const clientDoneSchema = object({
  phaseId: string().uuid().required(),
  clientId: string().required(),
})
  .noUnknown(true)
  .required()
  .strict();

export const collectProfitSchema = object({
  phaseId: string().uuid().required(),
  username: string().required(),
})
  .noUnknown(true)
  .required()
  .strict();
