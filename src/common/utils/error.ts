export function errorReturnHandler(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  } else if (typeof error === "string") {
    return new Error(error);
  } else {
    return new Error("something has gone wrong");
  }
}

export function checkIfError(variable: unknown | Error) {
  if (variable instanceof Error) {
    throw variable;
  }
}

export function errorThrowUtils(error: unknown) {
  if (error instanceof Error) {
    throw error;
  } else if (typeof error === "string") {
    throw new Error(error);
  } else {
    throw new Error("Something gone wrong");
  }
}
