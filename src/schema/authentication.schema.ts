import { object, string } from "yup";

export const adminLoginSchema = object({
  body: object({
    password: string().required(),
  }),
});

export const adminLoginSchemaSocket = object({
  token: string().required(),
})
  .noUnknown(true)
  .required()
  .strict();

export const tokenLoginSchemaSocket = object({
  token: string().required(),
  username: string().required(),
})
  .noUnknown(true)
  .required()
  .strict();