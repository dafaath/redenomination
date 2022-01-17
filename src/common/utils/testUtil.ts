import { AxiosResponse } from "axios";

export function hasResponseTemplate(responsePromise: Promise<AxiosResponse>) {
  test("Has response template", async () => {
    const response = await responsePromise;
    expect(response.data.status).toBeDefined();
    expect(typeof response.data.status).toBe("number");
    expect(response.data.message).toBeDefined();
    expect(typeof response.data.message).toBe("string");
    expect(response.data.data).toBeDefined();
    expect(typeof response.data.data).toBe("object");
  });
}
