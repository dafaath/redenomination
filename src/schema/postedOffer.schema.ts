import { number, object, string } from "yup";

export const inputSellerPriceSchema = object({
  price: number().required(),
  phaseId: string().uuid().required(),
})
  .noUnknown(true)
  .required()
  .strict();

export const buySchema = object({
  postedOfferId: string().required(),
  phaseId: string().uuid().required(),
})
  .noUnknown(true)
  .required()
  .strict();

export const requestListPOSchema = object({
  phaseId: string().uuid().required(),
})
  .noUnknown(true)
  .required()
  .strict();
