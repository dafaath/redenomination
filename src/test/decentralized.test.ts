import axios from "axios";
import { expect } from "chai";
import { errorThrowUtils } from "../common/utils/error";
import { getRandomNumberBetween } from "../common/utils/other";
import {
  createSessionTest,
  createSimulationTest,
  deleteSimulationTest,
  expectHaveTemplateResponse,
  getAdminJwtToken,
  handleAfterTest,
  HandleBeforeTest,
  SessionResponse,
  SimulationResponse,
  TestConnection,
} from "../common/utils/testUtil";
import config from "../configHandler";
import Bargain from "../db/entities/bargain.entity";
import { PhaseType } from "../db/entities/phase.entity";
import Transaction from "../db/entities/transaction.entity";

type DecentralizedResponse = {
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
  let decentralizedsResponse: Array<DecentralizedResponse> = [];

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
    simulationResponse = await createSimulationTest({
      buyerIsSuperRich: true,
    });
    expect(simulationResponse).to.have.property("sellers");
    expect(simulationResponse).to.have.property("buyers");
    return;
  });

  it("should create session", async () => {
    sessionResponse = await createSessionTest(simulationResponse.id);
    return;
  });

  it("admin can start session", async () => {
    const jwtToken = await getAdminJwtToken();
    const response = await axios.post(
      `http://localhost:${config.server.port}/api/sessions/${sessionResponse.id}/runs`,
      {},
      {
        headers: {
          Authorization: "Bearer " + jwtToken,
        },
      }
    );
    expect(response.status).to.be.equal(200);
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

  const phaseTypes = [
    PhaseType.PRE_REDENOM_PRICE,
    PhaseType.TRANSITION_PRICE,
    PhaseType.POST_REDENOM_PRICE,
  ];
  phaseTypes.forEach((phaseType) => {
    it("should be able start phase", async () => {
      try {
        const promises: Array<Promise<void>> = [];
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

        for (let i = 0; i < clientConnectionTotal; i++) {
          countReceiveMessage.push(0);
          const promise = new Promise<void>((resolve) => {
            testConnection.clientSockets[i].emit("startPhase", {
              phaseId: sessionResponse.phases.find(
                (p) => p.phaseType === phaseType
              )?.id,
            });
            testConnection.clientSockets[i].on("serverMessage", (response) => {
              expectHaveTemplateResponse(response);

              expect(response.status).to.be.equal(200);
              expect(response.message).to.contains("Successfully start");
              expect(response.data).to.have.property("phaseId");

              resolve();
            });
          });

          promises.push(promise);
        }

        await Promise.all(promises).then(() => {
          console.log("promise one complete");
        });
      } catch (error) {
        errorThrowUtils(error);
      }
    }).timeout(5000);

    it("seller should NOT be able to input price bellow unit cost in pre redenom", async () => {
      try {
        const promises: Array<Promise<void>> = [];
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
            const thisSocketUserData = connectedSocketData.find(
              (s) => s.detail.socketId === testConnection.clientSockets[i].id
            );
            const unitCost = thisSocketUserData
              ? thisSocketUserData.detail.unitCost
                ? thisSocketUserData.detail.unitCost
                : 2000
              : 2000;
            let price = unitCost - 1000;

            if (phaseType === PhaseType.TRANSITION_PRICE) {
              const rand = getRandomNumberBetween(0, 1);
              if (rand === 0) {
                price = price / 1000;
              }
            } else if (phaseType === PhaseType.POST_REDENOM_PRICE) {
              price = price / 1000;
            }

            const phase = sessionResponse.phases.find(
              (p) => p.phaseType === phaseType
            );
            const phaseId = phase?.id;
            testConnection.clientSockets[i].emit("ds:inputSellerPrice", {
              price: price,
              phaseId: phaseId,
            });

            testConnection.clientSockets[i].on("serverMessage", (response) => {
              expectHaveTemplateResponse(response);
              console.log(response);

              if (buyersSocketId.includes(testConnection.clientSockets[i].id)) {
                expect(response.status).to.be.equal(403);
                expect(response.message).to.contains("not a seller");
              }

              if (
                sellersSocketId.includes(testConnection.clientSockets[i].id)
              ) {
                expect(response.status).to.be.equal(400);
                expect(response.message).to.contains(
                  `must be higher than seller unit cost`
                );
              }

              resolve();
            });
          });

          promises.push(promise);
        }

        return await Promise.all(promises).then(() =>
          console.log("promise one finished")
        );
      } catch (error) {
        errorThrowUtils(error);
      }
    }).timeout(5000);

    it("seller should NOT be able to input price not in phaseType", async () => {
      try {
        if (phaseType === PhaseType.TRANSITION_PRICE) {
          return;
        }

        const promises: Array<Promise<void>> = [];
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
            const thisSocketUserData = connectedSocketData.find(
              (s) => s.detail.socketId === testConnection.clientSockets[i].id
            );
            const unitCost = thisSocketUserData
              ? thisSocketUserData.detail.unitCost
                ? thisSocketUserData.detail.unitCost
                : 2000
              : 2000;
            let price = getRandomNumberBetween(unitCost, unitCost + 2000);

            if (phaseType === PhaseType.PRE_REDENOM_PRICE) {
              price = price / 1000;
            }

            const phase = sessionResponse.phases.find(
              (p) => p.phaseType === phaseType
            );
            const phaseId = phase?.id;
            testConnection.clientSockets[i].emit("ds:inputSellerPrice", {
              price: price,
              phaseId: phaseId,
            });

            testConnection.clientSockets[i].on("serverMessage", (response) => {
              expectHaveTemplateResponse(response);

              if (buyersSocketId.includes(testConnection.clientSockets[i].id)) {
                expect(response.status).to.be.equal(403);
                expect(response.message).to.contains("not a seller");
              }

              if (
                sellersSocketId.includes(testConnection.clientSockets[i].id)
              ) {
                expect(response.status).to.be.equal(400);
                expect(response.message).to.contains(`redenomination`);
              }

              resolve();
            });
          });

          promises.push(promise);
        }

        await Promise.all(promises).then(() =>
          console.log("promise one finished")
        );
      } catch (error) {
        errorThrowUtils(error);
      }
    }).timeout(5000);

    it(
      "seller should be able to input price in phase " + phaseType,
      async () => {
        try {
          const promises: Array<Promise<void>> = [];
          const decentralizedPromises: Array<Promise<void>> = [];
          const totalBuyerSeller =
            simulationResponse.buyers.length +
            simulationResponse.sellers.length;
          const countReceiveMessage: Array<number> = [];
          const sentPrice: Array<number> = [];

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
              const thisSocketUserData = connectedSocketData.find(
                (s) => s.detail.socketId === testConnection.clientSockets[i].id
              );
              const unitCost = thisSocketUserData
                ? thisSocketUserData.detail.unitCost
                  ? thisSocketUserData.detail.unitCost
                  : 2000
                : 2000;
              let price = getRandomNumberBetween(unitCost, unitCost + 2000);

              if (
                sellersSocketId.includes(testConnection.clientSockets[i].id)
              ) {
                sentPrice.push(price);
              }

              if (phaseType === PhaseType.TRANSITION_PRICE) {
                const random = getRandomNumberBetween(0, 1);
                if (random === 0) {
                  price = price / 1000;
                }
              }

              if (phaseType === PhaseType.POST_REDENOM_PRICE) {
                price = price / 1000;
              }

              testConnection.clientSockets[i].emit("ds:inputSellerPrice", {
                price: price,
                phaseId: sessionResponse.phases.find(
                  (p) => p.phaseType === phaseType
                )?.id,
              });
              testConnection.clientSockets[i].on(
                "serverMessage",
                (response) => {
                  expectHaveTemplateResponse(response);

                  if (
                    buyersSocketId.includes(testConnection.clientSockets[i].id)
                  ) {
                    // Buyer can't
                    expect(response.status).to.be.equal(403);
                    expect(response.message).to.contains("not a seller");
                  }

                  if (
                    sellersSocketId.includes(testConnection.clientSockets[i].id)
                  ) {
                    // Seller can
                    expect(response.status).to.be.equal(200);
                    expect(response.message).to.contains("Successfully input");

                    expect(response.data.length).to.be.greaterThan(0);
                    expect(Array.isArray(response.data)).to.be.true;
                  }

                  resolve();
                }
              );
            });

            promises.push(promise);
          }

          for (let i = 0; i < totalBuyerSeller; i++) {
            const decentralizedPromise = new Promise<void>((resolve) => {
              testConnection.clientSockets[i].on(
                "decentralizedList",
                (response) => {
                  expect(Array.isArray(response)).to.be.true;
                  expect(response.length).to.be.greaterThan(0);
                  expect(response.length).to.be.lessThanOrEqual(
                    simulationResponse.sellers.length * phaseTypes.length
                  );

                  response.forEach((r: any) => {
                    expect(sentPrice.includes(r.price)).to.be.true;
                  });

                  countReceiveMessage[i] += 1;

                  if (countReceiveMessage[i] >= sellersSocketId.length) {
                    decentralizedsResponse = response;

                    resolve();
                  }
                }
              );
            });
            decentralizedPromises.push(decentralizedPromise);
          }

          await Promise.all(promises).then(() => {
            console.log("promise one complete");
          });
          await Promise.all(decentralizedPromises).then(() => {
            console.log("promise two complete");
          });
        } catch (error) {
          errorThrowUtils(error);
        }
      }
    ).timeout(5000);

    it(
      "buyer should be able to buy posted offer in phase " + phaseType,
      async () => {
        try {
          const promises: Array<Promise<void>> = [];
          const decentralizedPromises: Array<Promise<void>> = [];
          const totalBuyerSeller =
            simulationResponse.buyers.length +
            simulationResponse.sellers.length;
          const countReceiveMessage: Array<number> = [];

          for (
            let i = totalBuyerSeller;
            i < testConnection.clientSockets.length;
            i++
          ) {
            testConnection.clientSockets[i].on("readyMessage", (response) => {
              expect(
                response,
                "Socket outside of room should not able to listen"
              ).to.be.undefined;
            });
          }

          const buyersSocketId = connectedSocketData
            .filter((s) => s.type === "buyer")
            .map((s) => s.detail.socketId);
          const sellersSocketId = connectedSocketData
            .filter((s) => s.type === "seller")
            .map((s) => s.detail.socketId);

          let buyCount = 0;

          for (
            let i = 0;
            i < buyersSocketId.length + sellersSocketId.length;
            i++
          ) {
            for (let j = 0; j < 3; j++) {
              testConnection.clientSockets[i].emit("ds:buy", {
                decentralizedId: decentralizedsResponse[buyCount].id,
                phaseId: sessionResponse.phases.find(
                  (p) => p.phaseType === phaseType
                )?.id,
              });

              countReceiveMessage.push(0);
              let hasReceivePositiveMessage = false;
              const promise = new Promise<void>((resolve) => {
                testConnection.clientSockets[i].on(
                  "serverMessage",
                  (response) => {
                    expectHaveTemplateResponse(response);

                    if (
                      buyersSocketId.includes(
                        testConnection.clientSockets[i].id
                      )
                    ) {
                      if (!hasReceivePositiveMessage) {
                        expect(response.status).to.be.equal(200);
                        expect(response.message).to.contains(
                          "Successfully buy"
                        );
                        expect(Array.isArray(response.data)).to.be.true;
                        hasReceivePositiveMessage = true;
                      } else {
                        expect(response.status).to.be.equal(403);
                        expect(response.message).to.contains(
                          "only bought once"
                        );
                      }
                    }

                    if (
                      sellersSocketId.includes(
                        testConnection.clientSockets[i].id
                      )
                    ) {
                      // Seller can't
                      expect(response.status).to.be.equal(403);
                      expect(response.message).to.contains("not a buyer");
                    }

                    resolve();
                  }
                );
              });

              promises.push(promise);
            }

            if (buyersSocketId.includes(testConnection.clientSockets[i].id)) {
              if (buyCount < buyersSocketId.length - 1) {
                buyCount++;
              }
            }
          }

          for (let i = 0; i < totalBuyerSeller; i++) {
            const decentralizedPromise = new Promise<void>((resolve) => {
              testConnection.clientSockets[i].on(
                "decentralizedList",
                (response) => {
                  expect(Array.isArray(response)).to.be.true;
                  expect(response.length).to.be.greaterThan(0);
                  const haveIsSold = response.find(
                    (r: any) => r.isSold === true
                  );
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
                }
              );
            });
            decentralizedPromises.push(decentralizedPromise);
          }

          await Promise.all(promises);
          return Promise.all(decentralizedPromises);
        } catch (error) {
          errorThrowUtils(error);
        }
      }
    ).timeout(5000);

    it("should be able to end simulation in phase " + phaseType, async () => {
      try {
        const promises: Array<Promise<void>> = [];
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

        for (let i = 0; i < clientConnectionTotal; i++) {
          countReceiveMessage.push(0);
          const promise = new Promise<void>((resolve) => {
            testConnection.clientSockets[i].emit("finishPhase", {
              phaseId: sessionResponse.phases.find(
                (p) => p.phaseType === phaseType
              )?.id,
            });
            testConnection.clientSockets[i].on("serverMessage", (response) => {
              expectHaveTemplateResponse(response);

              expect(response.status).to.be.equal(200);
              expect(response.message).to.contains("Successfully finish");
              expect(response.data).to.have.property("phaseId");

              resolve();
            });
          });

          promises.push(promise);
        }

        await Promise.all(promises).then(() => {
          console.log("promise one complete");
        });
      } catch (error) {
        errorThrowUtils(error);
      }
    }).timeout(5000);
  });

  it("admin can finish session", async () => {
    const jwtToken = await getAdminJwtToken();
    const response = await axios.post(
      `http://localhost:${config.server.port}/api/sessions/${sessionResponse.id}/finishes`,
      {},
      {
        headers: {
          Authorization: "Bearer " + jwtToken,
        },
      }
    );
    expect(response.status).to.be.equal(200);
    return;
  });

  it("have transaction in database", async () => {
    const transactions = await Transaction.find({
      relations: ["phase", "buyer", "seller"],
    });
    const bargains = await Bargain.find({
      relations: ["phase", "buyer", "seller"],
    });
    expect(transactions.length).to.be.greaterThan(0);
    expect(transactions.length).to.be.equal(
      simulationResponse.sellers.length * phaseTypes.length
    );

    expect(bargains.length).to.be.greaterThan(0);
    expect(bargains.length).to.be.equal(
      simulationResponse.sellers.length * phaseTypes.length
    );

    bargains.forEach((b) => {
      expect(Boolean(b.seller), "Have seller").to.be.true;
      expect(Boolean(b.price), "Have price").to.be.true;
      expect(Boolean(b.timeCreated), "Have time created").to.be.true;
      expect(Object.keys(b.seller).length).to.be.greaterThan(0);
      expect(Object.keys(b.phase).length).to.be.greaterThan(0);
    });

    transactions.forEach((t) => {
      expect(Boolean(t.buyer), "Have buyer").to.be.true;
      expect(Boolean(t.seller), "Have seller").to.be.true;
      expect(Boolean(t.price), "Have price").to.be.true;
      expect(Boolean(t.timeCreated), "Have time created").to.be.true;
      expect(Object.keys(t.buyer).length).to.be.greaterThan(0);
      expect(Object.keys(t.seller).length).to.be.greaterThan(0);
      expect(Object.keys(t.phase).length).to.be.greaterThan(0);
    });
  });

  it("can delete simulations", async () => {
    const response = await deleteSimulationTest(simulationResponse.id);
    expect(response.status).to.equal(200);
  });
});
