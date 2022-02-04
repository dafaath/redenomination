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
import {
  doubleAuctionBuyerBid,
  doubleAuctionSellerBid,
} from "../db/shortLived";

type PostedOfferResponse = {
  id: string;
  sellerId: string;
  isSold: boolean;
  buyerId: string | null;
  price: number;
  timeCreated: Date;
};

describe("Double Auction", () => {
  const clientConnectionTotal = 25;
  let testConnection: TestConnection;
  let simulationResponse: SimulationResponse;
  let sessionResponse: SessionResponse;
  const connectedSocketData: Array<any> = [];
  const socketIdWithFinishedTransaction: Array<string> = [];
  let finishedSeller = 0;
  let finishedBuyer = 0;
  const sellerBargainPrices: Array<number> = [];
  const buyerBargainPrices: Array<number> = [];
  let numberOfBargainCreated = 0;
  let matchNumber = 0;

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
      numberOfBuyer: 10,
      numberOfSeller: 10,
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

  it("seller should NOT be able to input price bellow unit cost", async () => {
    try {
      const phaseTypes = [
        PhaseType.PRE_REDENOM_PRICE,
        PhaseType.TRANSITION_PRICE,
        PhaseType.TRANSITION_PRICE,
        PhaseType.POST_REDENOM_PRICE,
      ];
      for (let i = 0; i < phaseTypes.length; i++) {
        const phaseType = phaseTypes[i];
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
            testConnection.clientSockets[i].emit("da:postSeller", {
              sellerBargain: price,
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
                expect(response.message).to.contains(
                  `must be higher than seller unit cost`
                );
              }

              resolve();
            });
          });

          promises.push(promise);
        }

        await Promise.all(promises).then(() =>
          console.log("promise one finished")
        );
      }
    } catch (error) {
      errorThrowUtils(error);
    }
  }).timeout(2000);

  it("buyer should NOT be able to input price above unit cost", async () => {
    try {
      const phaseTypes = [
        PhaseType.PRE_REDENOM_PRICE,
        PhaseType.TRANSITION_PRICE,
        PhaseType.TRANSITION_PRICE,
        PhaseType.POST_REDENOM_PRICE,
      ];
      for (let i = 0; i < phaseTypes.length; i++) {
        const phaseType = phaseTypes[i];
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

            const unitValue = thisSocketUserData
              ? thisSocketUserData.detail.unitValue
                ? thisSocketUserData.detail.unitValue
                : 2000
              : 2000;
            let price = unitValue + 1000;

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

            testConnection.clientSockets[i].emit("da:postBuyer", {
              buyerBargain: price,
              phaseId: phaseId,
            });

            testConnection.clientSockets[i].on("serverMessage", (response) => {
              expectHaveTemplateResponse(response);

              if (buyersSocketId.includes(testConnection.clientSockets[i].id)) {
                expect(response.status).to.be.equal(400);
                expect(response.message).to.contains(
                  `must be lower than buyer unit value`
                );
              }

              if (
                sellersSocketId.includes(testConnection.clientSockets[i].id)
              ) {
                expect(response.status).to.be.equal(403);
                expect(response.message).to.contains("not a buyer");
              }

              resolve();
            });
          });

          promises.push(promise);
        }

        await Promise.all(promises).then(() =>
          console.log("promise one finished")
        );
      }
    } catch (error) {
      errorThrowUtils(error);
    }
  }).timeout(2000);

  it("seller should NOT be able to input price not in phaseType", async () => {
    try {
      const phaseTypes = [
        PhaseType.PRE_REDENOM_PRICE,
        PhaseType.POST_REDENOM_PRICE,
      ];
      for (let z = 0; z < phaseTypes.length; z++) {
        const phaseType = phaseTypes[z];
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
            testConnection.clientSockets[i].emit("da:postSeller", {
              sellerBargain: price,
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
      }
    } catch (error) {
      errorThrowUtils(error);
    }
  }).timeout(2000);

  it("buyer should NOT be able to input price not in phaseType", async () => {
    try {
      const phaseTypes = [
        PhaseType.PRE_REDENOM_PRICE,
        PhaseType.POST_REDENOM_PRICE,
      ];
      for (let z = 0; z < phaseTypes.length; z++) {
        const phaseType = phaseTypes[z];
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
            testConnection.clientSockets[i].emit("da:postBuyer", {
              buyerBargain: price,
              phaseId: phaseId,
            });

            testConnection.clientSockets[i].on("serverMessage", (response) => {
              expectHaveTemplateResponse(response);

              if (buyersSocketId.includes(testConnection.clientSockets[i].id)) {
                expect(response.status).to.be.equal(400);
                expect(response.message).to.contains(`redenomination`);
              }

              if (
                sellersSocketId.includes(testConnection.clientSockets[i].id)
              ) {
                expect(response.status).to.be.equal(403);
                expect(response.message).to.contains("not a buyer");
              }

              resolve();
            });
          });

          promises.push(promise);
        }

        await Promise.all(promises).then(() =>
          console.log("promise one finished")
        );
      }
    } catch (error) {
      errorThrowUtils(error);
    }
  }).timeout(2000);

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
    }).timeout(2000);

    for (let o = 0; o < 10; o++) {
      it(
        "seller should be able to input price in phase " + phaseType,
        async () => {
          try {
            const promises: Array<Promise<void>> = [];
            const doubleAuctionPromises: Array<Promise<void>> = [];
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
                  (s) =>
                    s.detail.socketId === testConnection.clientSockets[i].id
                );
                const unitCost = thisSocketUserData
                  ? thisSocketUserData.detail.unitCost
                    ? thisSocketUserData.detail.unitCost
                    : 2000
                  : 2000;

                const randomNumber = getRandomNumberBetween(0, 100);

                let price: number;
                if (randomNumber < 90) {
                  // should not match
                  price = getRandomNumberBetween(unitCost, unitCost + 2000);
                } else {
                  // should match
                  const filteredBuyerBargainPrices = buyerBargainPrices.filter(
                    (p) => p > unitCost
                  );
                  price =
                    filteredBuyerBargainPrices[
                      getRandomNumberBetween(
                        0,
                        filteredBuyerBargainPrices.length - 1
                      )
                    ];

                  if (price == undefined) {
                    price = getRandomNumberBetween(unitCost, unitCost + 2000);
                  }
                }

                if (
                  sellersSocketId.includes(testConnection.clientSockets[i].id)
                ) {
                  sellerBargainPrices.push(price);
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

                const phaseId = sessionResponse.phases.find(
                  (p) => p.phaseType === phaseType
                )?.id;

                testConnection.clientSockets[i].emit("da:postSeller", {
                  sellerBargain: price,
                  phaseId: phaseId,
                });
                testConnection.clientSockets[i].on(
                  "serverMessage",
                  (response) => {
                    expectHaveTemplateResponse(response);

                    if (
                      buyersSocketId.includes(
                        testConnection.clientSockets[i].id
                      )
                    ) {
                      // Buyer can't
                      expect(response.status).to.be.equal(403);
                      expect(response.message).to.contains("not a seller");
                    }

                    if (
                      sellersSocketId.includes(
                        testConnection.clientSockets[i].id
                      )
                    ) {
                      if (
                        socketIdWithFinishedTransaction.includes(
                          testConnection.clientSockets[i].id
                        )
                      ) {
                        expect(response.status).to.be.equal(403);
                        expect(response.message).to.contains(
                          "You already sold your item"
                        );
                      } else {
                        // Seller can
                        if (response.data.matchData.match) {
                          expect(response.status).to.be.equal(201);
                          expect(response.message).to.contains("match");
                          socketIdWithFinishedTransaction.push(
                            response.data.matchData.seller.socketId
                          );
                          socketIdWithFinishedTransaction.push(
                            response.data.matchData.buyer.socketId
                          );

                          const sellerBidMatchIndex = doubleAuctionSellerBid
                            .filter((sb) => sb.phaseId === phaseId)
                            .findIndex(
                              (sb) =>
                                sb.sellerBid.sellerId ===
                                response.data.matchData.seller.id
                            );
                          const buyerBidMatchIndex = doubleAuctionBuyerBid
                            .filter((sb) => sb.phaseId === phaseId)
                            .findIndex(
                              (sb) =>
                                sb.buyerBid.buyerId ===
                                response.data.matchData.seller.id
                            );
                          expect(sellerBidMatchIndex).to.equal(-1);
                          expect(buyerBidMatchIndex).to.equal(-1);

                          const sellerSocket =
                            testConnection.clientSockets.find(
                              (cs) =>
                                cs.id ===
                                response.data.matchData.seller.socketId
                            );
                          const buyerSocket = testConnection.clientSockets.find(
                            (cs) =>
                              cs.id === response.data.matchData.buyer.socketId
                          );

                          sellerSocket?.once("bidMatch", (bidMatchResponse) => {
                            expect(bidMatchResponse).to.be.an("object");
                            expect(bidMatchResponse).to.have.property("match");
                            expect(bidMatchResponse).to.have.property("buyer");
                            expect(bidMatchResponse).to.have.property("seller");
                            expect(bidMatchResponse).to.have.property(
                              "transaction"
                            );
                          });

                          buyerSocket?.once("bidMatch", (bidMatchResponse) => {
                            expect(bidMatchResponse).to.be.an("object");
                            expect(bidMatchResponse).to.have.property("match");
                            expect(bidMatchResponse).to.have.property("buyer");
                            expect(bidMatchResponse).to.have.property("seller");
                            expect(bidMatchResponse).to.have.property(
                              "transaction"
                            );
                          });

                          finishedSeller += 1;
                          finishedBuyer += 1;
                          matchNumber += 1;
                        } else {
                          expect(response.status).to.be.equal(200);
                          expect(response.message).to.contains(
                            "Successfully input seller price"
                          );
                        }
                        expect(response.data).to.be.an("object");
                        expect(response.data).to.have.property("maxPrice");
                        expect(response.data.maxPrice).to.be.a("number");
                        expect(response.data).to.have.property("minPrice");
                        expect(response.data.minPrice).to.be.a("number");
                        numberOfBargainCreated += 1;
                      }
                    }

                    resolve();
                  }
                );
              });

              promises.push(promise);
            }

            for (let i = 0; i < totalBuyerSeller; i++) {
              const doubleAuctionPromise = new Promise<void>((resolve) => {
                testConnection.clientSockets[i].on(
                  "doubleAuctionList",
                  (response) => {
                    expect(response).to.be.an("object");
                    expect(response).to.have.property("maxPrice");
                    expect(response.maxPrice).to.be.a("number");
                    expect(response).to.have.property("minPrice");
                    expect(response.minPrice).to.be.a("number");

                    countReceiveMessage[i] += 1;

                    if (
                      countReceiveMessage[i] >=
                      sellersSocketId.length - finishedSeller
                    ) {
                      resolve();
                    }
                  }
                );
              });
              doubleAuctionPromises.push(doubleAuctionPromise);
            }

            await Promise.all(promises).then(() => {
              console.log("promise one complete");
            });
            await Promise.all(doubleAuctionPromises).then(() => {
              console.log("promise two complete");
            });
          } catch (error) {
            errorThrowUtils(error);
          }
        }
      ).timeout(2000);

      it("can delete buyerBargainList ", () => {
        buyerBargainPrices.splice(0, buyerBargainPrices.length);
        expect(buyerBargainPrices.length).to.be.equal(0);
      });

      it(
        "buyer should be able to input price in phase " + phaseType,
        async () => {
          try {
            const promises: Array<Promise<void>> = [];
            const doubleAuctionPromises: Array<Promise<void>> = [];
            const totalBuyerSeller =
              simulationResponse.buyers.length +
              simulationResponse.sellers.length;
            const countReceiveMessage: Array<number> = [];
            const matchPromise: Array<Promise<void>> = [];

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
                  (s) =>
                    s.detail.socketId === testConnection.clientSockets[i].id
                );
                const unitValue = thisSocketUserData
                  ? thisSocketUserData.detail.unitValue
                    ? thisSocketUserData.detail.unitValue
                    : 2000
                  : 2000;

                const randomNumber = getRandomNumberBetween(0, 100);

                let price: number;
                if (randomNumber < 90) {
                  // should not match
                  price = getRandomNumberBetween(unitValue, unitValue - 1000);
                } else {
                  // should match
                  const filteredSellerBargainPrices =
                    sellerBargainPrices.filter((p) => p < unitValue);
                  price =
                    filteredSellerBargainPrices[
                      getRandomNumberBetween(
                        0,
                        filteredSellerBargainPrices.length - 1
                      )
                    ];

                  if (price == undefined) {
                    price = getRandomNumberBetween(unitValue, unitValue - 1000);
                  }
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
                buyerBargainPrices.push(price);

                const phaseId = sessionResponse.phases.find(
                  (p) => p.phaseType === phaseType
                )?.id;
                testConnection.clientSockets[i].emit("da:postBuyer", {
                  buyerBargain: price,
                  phaseId: phaseId,
                });

                testConnection.clientSockets[i].on(
                  "serverMessage",
                  (response) => {
                    expectHaveTemplateResponse(response);

                    if (
                      buyersSocketId.includes(
                        testConnection.clientSockets[i].id
                      )
                    ) {
                      // Buyer can

                      if (
                        socketIdWithFinishedTransaction.includes(
                          testConnection.clientSockets[i].id
                        )
                      ) {
                        expect(response.status).to.be.equal(403);
                        expect(response.message).to.contains(
                          "You already bought your item"
                        );
                      } else {
                        if (response.data.matchData.match) {
                          expect(response.status).to.be.equal(201);
                          expect(response.message).to.contains("match");
                          socketIdWithFinishedTransaction.push(
                            response.data.matchData.seller.socketId
                          );
                          socketIdWithFinishedTransaction.push(
                            response.data.matchData.buyer.socketId
                          );

                          const sellerSocket =
                            testConnection.clientSockets.find(
                              (cs) =>
                                cs.id ===
                                response.data.matchData.seller.socketId
                            );
                          const buyerSocket = testConnection.clientSockets.find(
                            (cs) =>
                              cs.id === response.data.matchData.buyer.socketId
                          );

                          const sellerBidMatchIndex = doubleAuctionSellerBid
                            .filter((sb) => sb.phaseId === phaseId)
                            .findIndex(
                              (sb) =>
                                sb.sellerBid.sellerId ===
                                response.data.matchData.seller.id
                            );
                          const buyerBidMatchIndex = doubleAuctionBuyerBid
                            .filter((sb) => sb.phaseId === phaseId)
                            .findIndex(
                              (sb) =>
                                sb.buyerBid.buyerId ===
                                response.data.matchData.seller.id
                            );
                          expect(sellerBidMatchIndex).to.equal(-1);
                          expect(buyerBidMatchIndex).to.equal(-1);

                          const sellerPromise = new Promise<void>((resolve) => {
                            sellerSocket?.once(
                              "bidMatch",
                              (bidMatchResponse) => {
                                expect(bidMatchResponse).to.be.an("object");
                                expect(bidMatchResponse).to.have.property(
                                  "match"
                                );
                                expect(bidMatchResponse).to.have.property(
                                  "buyer"
                                );
                                expect(bidMatchResponse).to.have.property(
                                  "seller"
                                );
                                expect(bidMatchResponse).to.have.property(
                                  "transaction"
                                );
                                resolve();
                              }
                            );
                          });

                          const buyerPromise = new Promise<void>((resolve) => {
                            buyerSocket?.once(
                              "bidMatch",
                              (bidMatchResponse) => {
                                expect(bidMatchResponse).to.be.an("object");
                                expect(bidMatchResponse).to.have.property(
                                  "match"
                                );
                                expect(bidMatchResponse).to.have.property(
                                  "buyer"
                                );
                                expect(bidMatchResponse).to.have.property(
                                  "seller"
                                );
                                expect(bidMatchResponse).to.have.property(
                                  "transaction"
                                );
                                resolve();
                              }
                            );
                          });

                          matchPromise.push(buyerPromise, sellerPromise);
                          finishedSeller += 1;
                          finishedBuyer += 1;
                          matchNumber += 1;
                        } else {
                          expect(response.status).to.be.equal(200);

                          expect(response.message).to.contains(
                            "Successfully input buyer price"
                          );
                        }

                        expect(response.data).to.be.an("object");
                        expect(response.data).to.have.property("maxPrice");
                        expect(response.data.maxPrice).to.be.a("number");
                        expect(response.data).to.have.property("minPrice");
                        expect(response.data.minPrice).to.be.a("number");
                        expect(response.data).to.have.property("matchData");
                        numberOfBargainCreated += 1;
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

            for (let i = 0; i < totalBuyerSeller; i++) {
              const doubleAuctionPromise = new Promise<void>((resolve) => {
                testConnection.clientSockets[i].on(
                  "doubleAuctionList",
                  (response) => {
                    expect(response).to.be.an("object");
                    expect(response).to.have.property("maxPrice");
                    expect(response.maxPrice).to.be.a("number");
                    expect(response).to.have.property("minPrice");
                    expect(response.minPrice).to.be.a("number");

                    countReceiveMessage[i] += 1;

                    if (
                      countReceiveMessage[i] >=
                      buyersSocketId.length - finishedBuyer
                    ) {
                      resolve();
                    }
                  }
                );
              });
              doubleAuctionPromises.push(doubleAuctionPromise);
            }

            await Promise.all(promises).then(() => {
              console.log("promise one complete");
            });
            await Promise.all(doubleAuctionPromises).then(() => {
              console.log("promise two complete");
            });
          } catch (error) {
            errorThrowUtils(error);
          }
        }
      ).timeout(2000);

      it("can delete sellerBargainList ", () => {
        sellerBargainPrices.splice(0, sellerBargainPrices.length);
        expect(sellerBargainPrices.length).to.be.equal(0);
      });
    }

    it("database have correct amount of open bid", () => {
      const totalBuyerSocket = connectedSocketData.filter(
        (csd) => csd.type === "buyer"
      ).length;
      const totalSellerSocket = connectedSocketData.filter(
        (csd) => csd.type === "seller"
      ).length;
      const finishedBuyerSocket = connectedSocketData
        .filter((csd) => csd.type === "buyer")
        .filter((csd) =>
          socketIdWithFinishedTransaction.includes(csd.detail.socketId)
        ).length;
      const finishedSellerSocket = connectedSocketData
        .filter((csd) => csd.type === "seller")
        .filter((csd) =>
          socketIdWithFinishedTransaction.includes(csd.detail.socketId)
        ).length;

      expect(doubleAuctionBuyerBid.length).to.equal(
        totalBuyerSocket - finishedBuyerSocket
      );
      expect(doubleAuctionSellerBid.length).to.equal(
        totalSellerSocket - finishedSellerSocket
      );
    });

    it("can delete socketIdWithFinishedTransaction", () => {
      socketIdWithFinishedTransaction.splice(
        0,
        socketIdWithFinishedTransaction.length
      );
      expect(socketIdWithFinishedTransaction.length).to.be.equal(0);
    });

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
    }).timeout(2000);
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
    expect(transactions.length).to.be.equal(matchNumber);

    expect(bargains.length).to.be.greaterThan(0);
    expect(bargains.length).to.be.equal(numberOfBargainCreated);

    bargains.forEach((b) => {
      expect(Boolean(b.seller) || Boolean(b.buyer), "Have seller or buyer").to
        .be.true;
      expect(Boolean(b.price), "Have price").to.be.true;
      expect(Boolean(b.timeCreated), "Have time created").to.be.true;
      if (b.seller) {
        expect(Object.keys(b.seller).length > 0).to.be.true;
      }
      if (b.buyer) {
        expect(Object.keys(b.buyer).length > 0).to.be.true;
      }
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
