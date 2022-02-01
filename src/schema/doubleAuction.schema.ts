import { number, object, string } from "yup";

export const postSellerSchema = object({
  price: number().required(),
  phaseId: string().uuid().required(),
})
  .noUnknown(true)
  .required()
  .strict();
