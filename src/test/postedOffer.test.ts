import { expect } from "chai";
import { errorThrowUtils } from "../common/utils/error";
import {
  createSessionTest,
  createSimulationTest,
  deleteSimulationTest,
  expectHaveTemplateResponse,
  handleAfterTest,
  HandleBeforeTest,
  SessionResponse,
  SimulationResponse,
  TestConnection,
} from "../common/utils/testUtil";
import Transaction from "../db/entities/transaction.entity";

type PostedOfferResponse = {
  id: string;
  sellerId: string;
  isSold: boolean;
  buyerId: string | null;
  price: number;
  timeCreated: Date;
};

describe("Posted offer", () => {
  const clientConnectionTotal = 10;
  let testConnection: TestConnection;
  let simulationResponse: SimulationResponse;
  let sessionResponse: SessionResponse;
  const connectedSocketData: Array<any> = [];
  let postedOffersResponse: Array<PostedOfferResponse> = [];

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
      testConnection.clientSockets[i].removeAllListeners();
    }
    done();
  });

  it("should create simulation", async () => {
    simulationResponse = await createSimulationTest();
    expect(simulationResponse).to.have.property("sellers");
    expect(simulationResponse).to.have.property("buyers");
    return;
  });

  it("should create session", async () => {
    sessionResponse = await createSessionTest(simulationResponse.id);
    expect(simulationResponse).to.have.property("sellers");
    expect(simulationResponse).to.have.property("buyers");
    return;
  });

  it("should able to join room", async () => {
    try {
      const promises: Array<Promise<void>> = [];

      const totalBuyerSeller =
        simulationResponse.buyers.length + simulationResponse.sellers.length;

      for (let i = 0; i < totalBuyerSeller; i++) {
        const promise = new Promise<void>((resolve) => {
          testConnection.clientSockets[i].emit("loginToken", {
            token: simulationResponse.token,
          });
          testConnection.clientSockets[i].on(
            "serverMessage",
            async (response) => {
              expectHaveTemplateResponse(response);
              expect(response.status).to.be.equal(200);
              expect(response.message).to.contains("join room");
              expect(response.data).to.have.property("type");
              expect(response.data.type).to.be.oneOf(["buyer", "seller"]);
              expect(response.data).to.have.property("detail");
              expect(response.data.detail).to.have.property("id");
              expect(response.data.detail).to.have.property("loginToken");
              expect(response.data.detail.loginToken).to.be.equal(
                simulationResponse.token
              );
              expect(
                response.data.detail.unitValue != undefined ||
                  response.data.detail.unitCost != undefined
              ).to.be.true;
              expect(response.data.detail).to.have.property("isLoggedIn");
              expect(response.data.detail).to.have.property("socketId");
              expect(response.data.detail.socketId).to.be.equal(
                testConnection.clientSockets[i].id
              );
              connectedSocketData.push(response.data);

              resolve();
            }
          );
        });
        promises.push(promise);
      }

      await Promise.all(promises);

      return;
    } catch (error) {
      errorThrowUtils(error);
    }
  });

  it("seller should be able to input price", async () => {
    try {
      const promises: Array<Promise<void>> = [];
      const postedOfferPromises: Array<Promise<void>> = [];
      const totalBuyerSeller =
        simulationResponse.buyers.length + simulationResponse.sellers.length;
      const countReceiveMessage: Array<number> = [];

      for (
        let i = totalBuyerSeller;
        i < testConnection.clientSockets.length;
        i++
      ) {
        testConnection.clientSockets[i].on("readyMessage", (response) => {
          expect(response).to.be.undefined;
        });
      }

      const buyersSocketId = connectedSocketData
        .filter((s) => s.type === "buyer")
        .map((s) => s.detail.socketId);
      const sellersSocketId = connectedSocketData
        .filter((s) => s.type === "seller")
        .map((s) => s.detail.socketId);

      for (let i = 0; i < clientConnectionTotal; i++) {
        countReceiveMessage.push(0);
        const promise = new Promise<void>((resolve) => {
          testConnection.clientSockets[i].emit("po:inputSellerPrice", {
            price: 2000,
          });
          testConnection.clientSockets[i].on("serverMessage", (response) => {
            expectHaveTemplateResponse(response);

            if (buyersSocketId.includes(testConnection.clientSockets[i].id)) {
              // Buyer can't
              expect(response.status).to.be.equal(403);
              expect(response.message).to.contains("not a seller");
            }

            if (sellersSocketId.includes(testConnection.clientSockets[i].id)) {
              // Seller can
              expect(response.status).to.be.equal(200);
              expect(response.message).to.contains("Successfully input");

              expect(response.data.length).to.be.greaterThan(0);
              expect(Array.isArray(response.data)).to.be.true;
            }

            resolve();
          });
        });

        promises.push(promise);
      }

      for (let i = 0; i < totalBuyerSeller; i++) {
        const postedOfferPromise = new Promise<void>((resolve) => {
          testConnection.clientSockets[i].on("postedOfferList", (response) => {
            expect(Array.isArray(response)).to.be.true;
            expect(response.length).to.be.greaterThan(0);
            expect(response.length).to.be.lessThanOrEqual(
              simulationResponse.sellers.length
            );

            countReceiveMessage[i] += 1;

            if (countReceiveMessage[i] >= sellersSocketId.length) {
              postedOffersResponse = response;

              resolve();
            }
          });
        });
        postedOfferPromises.push(postedOfferPromise);
      }

      await Promise.all(promises);
      return Promise.all(postedOfferPromises);
    } catch (error) {
      errorThrowUtils(error);
    }
  }).timeout(5000);

  it("buyer should be able to buy posted offer", async () => {
    try {
      const promises: Array<Promise<void>> = [];
      const postedOfferPromises: Array<Promise<void>> = [];
      const totalBuyerSeller =
        simulationResponse.buyers.length + simulationResponse.sellers.length;
      const countReceiveMessage: Array<number> = [];

      for (
        let i = totalBuyerSeller;
        i < testConnection.clientSockets.length;
        i++
      ) {
        testConnection.clientSockets[i].on("readyMessage", (response) => {
          expect(response, "Socket outside of room should not able to listen")
            .to.be.undefined;
        });
      }

      const buyersSocketId = connectedSocketData
        .filter((s) => s.type === "buyer")
        .map((s) => s.detail.socketId);
      const sellersSocketId = connectedSocketData
        .filter((s) => s.type === "seller")
        .map((s) => s.detail.socketId);

      let buyCount = -1;

      for (let i = 0; i < buyersSocketId.length + sellersSocketId.length; i++) {
        if (buyersSocketId.includes(testConnection.clientSockets[i].id)) {
          if (buyCount < buyersSocketId.length - 1) {
            buyCount++;
          }
        }

        for (let j = 0; j < 3; j++) {
          testConnection.clientSockets[i].emit("po:buy", {
            postedOfferId: postedOffersResponse[buyCount].id,
            phaseId: sessionResponse.phases[0].id,
          });

          countReceiveMessage.push(0);
          let hasReceivePositiveMessage = false;
          const promise = new Promise<void>((resolve) => {
            testConnection.clientSockets[i].on("serverMessage", (response) => {
              expectHaveTemplateResponse(response);

              if (buyersSocketId.includes(testConnection.clientSockets[i].id)) {
                if (!hasReceivePositiveMessage) {
                  expect(response.status).to.be.equal(200);
                  expect(response.message).to.contains("Successfully buy");
                  expect(Array.isArray(response.data)).to.be.true;
                  hasReceivePositiveMessage = true;
                } else {
                  expect(response.status).to.be.equal(403, `this is loop ${j}`);
                  expect(response.message).to.contains("has been sold");
                }
              }

              if (
                sellersSocketId.includes(testConnection.clientSockets[i].id)
              ) {
                // Seller can't
                expect(response.status).to.be.equal(403);
                expect(response.message).to.contains("not a buyer");
              }

              resolve();
            });
          });

          promises.push(promise);
        }
      }

      for (let i = 0; i < totalBuyerSeller; i++) {
        const postedOfferPromise = new Promise<void>((resolve) => {
          testConnection.clientSockets[i].on("postedOfferList", (response) => {
            expect(Array.isArray(response)).to.be.true;
            expect(response.length).to.be.greaterThan(0);
            expect(response.length).to.be.lessThanOrEqual(
              simulationResponse.sellers.length
            );
            const haveIsSold = response.find((r: any) => r.isSold === true);
            expect(haveIsSold).to.not.be.undefined;

            countReceiveMessage[i] += 1;

            if (countReceiveMessage[i] >= sellersSocketId.length) {
              let isAllSold = true;
              for (let j = 0; j < response.length; j++) {
                if (response.isSold === false) {
                  isAllSold = false;
                }
              }
              expect(isAllSold).to.be.true;
              resolve();
            }
          });
        });
        postedOfferPromises.push(postedOfferPromise);
      }

      await Promise.all(promises);
      return Promise.all(postedOfferPromises);
    } catch (error) {
      errorThrowUtils(error);
    }
  }).timeout(5000);

  it("have transaction in database", async () => {
    const transactions = await Transaction.find();
    expect(transactions.length).to.be.greaterThan(0);
    expect(transactions.length).to.be.equal(simulationResponse.sellers.length);
  });

  it("can delete simulations", async () => {
    const response = await deleteSimulationTest(simulationResponse.id);
    expect(response.status).to.equal(200);
  });
});
