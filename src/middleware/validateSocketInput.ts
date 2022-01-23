import createHttpError from "http-errors";
import { AnySchema } from "yup";
import { errorReturnHandler } from "../common/utils/error";

export const validateSocketInput = (
  packet: unknown,
  schema: AnySchema
): Error | undefined => {
  try {
    if (
      !(typeof packet === "object" && !Array.isArray(packet) && packet !== null)
    ) {
      throw createHttpError(
        400,
        "make sure you only send one object with the correct parameter, not multiple data"
      );
    }

    schema.validateSync(packet);
  } catch (error) {
    return errorReturnHandler(error);
  }
};
