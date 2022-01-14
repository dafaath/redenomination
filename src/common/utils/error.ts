export function errorReturnHandler(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  } else if (typeof error === "string") {
    return new Error(error);
  } else {
    return new Error("something has gone wrong");
  }
}
