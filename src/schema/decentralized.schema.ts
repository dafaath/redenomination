import { number, object, string } from "yup";

export const inputSellerPriceSchema = object({
  price: number().required(),
  phaseId: string().uuid().required(),
})
  .noUnknown(true)
  .required()
  .strict();

export const buySchema = object({
  decentralizedId: string().required(),
  phaseId: string().uuid().required(),
})
  .noUnknown(true)
  .required()
  .strict();
