import { expect } from "chai";
import { errorThrowUtils } from "../common/utils/error";
import {
  expectHaveTemplateResponse,
  handleAfterTest,
  HandleBeforeTest,
  TestConnection,
} from "../common/utils/testUtil";

describe("Socket server", () => {
  const clientConnectionTotal = 10;
  let testConnection: TestConnection;

  before((done) => {
    HandleBeforeTest(clientConnectionTotal)
      .then((tc) => {
        if (tc) {
          testConnection = tc;
        }
        done();
      })
      .catch((err) => errorThrowUtils(err));
  });

  afterEach((done) => {
    for (let i = 0; i < testConnection.clientSockets.length; i++) {
      testConnection.clientSockets[i].removeAllListeners();
    }
    done();
  });

  after(() => {
    handleAfterTest(testConnection);
  });

  it("should work", async () => {
    try {
      const promises: Array<Promise<void>> = [];

      for (let i = 0; i < clientConnectionTotal; i++) {
        const promise = new Promise<void>((resolve) => {
          testConnection.clientSockets[i].emit("checkHealth");
          testConnection.clientSockets[i].on("serverMessage", (response) => {
            expectHaveTemplateResponse(response);
            expect(response.status).to.be.equal(200);
            expect(response.message).to.contains("fine");

            resolve();
          });
        });

        promises.push(promise);
      }

      return Promise.all(promises);
    } catch (error) {
      errorThrowUtils(error);
    }
  });
});
