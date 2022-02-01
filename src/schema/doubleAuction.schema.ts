import { number, object, string } from "yup";

export const postSellerSchema = object({
  sellerBargain: number().required(),
  phaseId: string().uuid().required(),
})
  .noUnknown(true)
  .required()
  .strict();

export const postBuyerSchema = object({
  buyerBargain: number().required(),
  phaseId: string().uuid().required(),
})
  .noUnknown(true)
  .required()
  .strict();
