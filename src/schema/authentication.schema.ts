import { object, string } from "yup";

export const adminLoginSchema = object({
  body: object({
    password: string().required(),
  }),
});

export const tokenLoginSchema = object({
  body: object({
    token: string().required(),
  }),
});
