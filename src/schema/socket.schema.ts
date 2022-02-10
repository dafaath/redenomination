import { object, string, number } from "yup";

export const startPhaseSchema = object({
  phaseId: string().uuid().required(),
})
  .noUnknown(true)
  .required()
  .strict();

export const finishPhaseSchema = object({
  phaseId: string().uuid().required(),
})
  .noUnknown(true)
  .required()
  .strict();

export const collectProfitSchema = object({
  participantId: string().uuid().required(),
})
  .noUnknown(true)
  .required()
  .strict();
