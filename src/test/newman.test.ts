import { expect } from "chai";
import newman, { NewmanRunSummary } from "newman";
import { errorThrowUtils } from "../common/utils/error";
import log from "../common/utils/logger";
import {
  handleAfterTest,
  HandleBeforeTest,
  TestConnection,
} from "../common/utils/testUtil";
import config from "../configHandler";

describe("REST API", () => {
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

  after(() => {
    handleAfterTest(testConnection);
  });

  afterEach((done) => {
    for (let i = 0; i < testConnection.clientSockets.length; i++) {
      testConnection.clientSockets[i].off("serverMessage");
    }
    done();
  });

  const collection = `https://api.getpostman.com/collections/14947205-89f0f15a-7315-4c1c-b5b0-6cacd646dea3?apikey=${config.postmanApiKey}`;

  const environmentUuid =
    process.env.NODE_ENV === "production"
      ? "14947205-2a99e3cd-522c-4cbc-8fc7-506201f7d0bd"
      : "14947205-02c5ca02-9f24-40a3-ae9f-1dacd056ce16";

  const environment = `https://api.getpostman.com/environments/${environmentUuid}?apikey=${config.postmanApiKey}`;

  it("Should successfully run newman", (done) => {
    newman.run(
      {
        collection: collection,
        environment: environment,
        reporters: "cli",
      },
      function (err, summary: NewmanRunSummary) {
        if (err) {
          log.error(err);
          throw err;
        }

        expect(summary.run.failures.length, "Have no failed run").to.be.equal(
          0
        );
        expect(err).to.be.null;

        log.info("Collection run complete!");
        done();
      }
    );
  }).timeout(20000);
});
