import axios from "axios";
import { expect } from "chai";
import { afterEach } from "mocha";
import { errorThrowUtils } from "../common/utils/error";
import {
  createSessionTest,
  createSimulationTest,
  deleteSimulationTest,
  expectHaveTemplateResponse,
  getAdminJwtToken,
  getBuyerOrSellerUsername,
  handleAfterTest,
  HandleBeforeTest,
  SessionResponse,
  SimulationResponse,
  TestConnection,
} from "../common/utils/testUtil";
import config from "../configHandler";
import Buyer from "../db/entities/buyer.entity";
import Seller from "../db/entities/seller.entity";

describe("Authentication", () => {
  const clientConnectionTotal = 10;
  let testConnection: TestConnection;
  let simulationResponse: SimulationResponse;
  const sessionResponses: SessionResponse[] = [];

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
    console.log(simulationResponse);
    return;
  });

  const numberOfCreatedSession = 5;
  it("should create session", async () => {
    for (let i = 0; i < numberOfCreatedSession; i++) {
      const sessionResponse = await createSessionTest(simulationResponse.id);
      sessionResponses.push(sessionResponse);
    }
    sessionResponses.forEach((sessionResponse) => {
      expect(sessionResponse).to.have.property("phases");
      expect(sessionResponse).to.have.property("id");
    });
    return;
  });

  for (let z = 0; z < numberOfCreatedSession; z++) {
    it("socket can connect", async () => {
      try {
        const promises: Array<Promise<void>> = testConnection.clientSockets.map(
          async (cs) => {
            if (cs.disconnected) {
              cs.connect();

              return new Promise((resolve) => {
                cs.on("connect", () => {
                  resolve();
                });
              });
            }
          }
        );

        return Promise.all(promises);
      } catch (error) {
        errorThrowUtils(error);
      }
    }).timeout(5000);

    it("admin can start session", async () => {
      const sessionResponse = sessionResponses[z];
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
          const sessionResponse = sessionResponses[z];
          const sellerOrBuyer = getBuyerOrSellerUsername(
            simulationResponse,
            true
          );

          if (!sellerOrBuyer) {
            throw new Error("All seller or buyer is logged in");
          }
          const promise = new Promise<void>((resolve) => {
            testConnection.clientSockets[i].emit("loginToken", {
              token: simulationResponse.token,
              username: sellerOrBuyer.username,
            });
            testConnection.clientSockets[i].on(
              "serverMessage",
              async (response) => {
                console.log(response);
                expectHaveTemplateResponse(response);
                expect(response.status).to.be.equal(200);
                expect(response.message).to.contains("join room");
                expect(response.data).to.have.property("type");
                expect(response.data).to.have.property("detail");
                expect(response.data).to.have.property("simulationType");
                expect(response.data).to.have.property("goodsType");
                expect(response.data).to.have.property("goodsName");
                expect(response.data).to.have.property("inflationType");
                expect(response.data).to.have.property("timer");
                expect(response.data.timer).to.be.a("number");
                expect(response.data).to.have.property("phases");
                expect(response.data).to.have.property("isSessionRunning");
                expect(response.data.isSessionRunning).to.be.an("boolean");
                expect(Array.isArray(response.data.phases)).to.be.true;
                expect(response.data.phases.length).to.be.equal(3);
                response.data.phases.forEach((p: any) => {
                  const haveThisId = sessionResponse.phases.find(
                    (phases) => phases.id === p.id
                  );
                  expect(p).to.have.property("id");
                  expect(p).to.have.property("phaseType");
                  expect(haveThisId).to.not.be.undefined;
                });

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

    it("can't join anymore", async () => {
      try {
        const promises: Array<Promise<void>> = [];

        const totalBuyerSeller =
          simulationResponse.buyers.length + simulationResponse.sellers.length;

        for (let i = 0; i < totalBuyerSeller; i++) {
          const sellerOrBuyer = getBuyerOrSellerUsername(simulationResponse);

          if (!sellerOrBuyer) {
            throw new Error("All seller or buyer is logged in");
          }
          const promise = new Promise<void>((resolve) => {
            testConnection.clientSockets[i].emit("loginToken", {
              token: simulationResponse.token,
              username: sellerOrBuyer.username,
            });

            testConnection.clientSockets[i].on("serverMessage", (response) => {
              expectHaveTemplateResponse(response);
              expect(response.status).to.be.equal(409);
              expect(response.message).to.contains("already join room");
              expect(Object.keys(response.data)).to.have.lengthOf(0);

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

    // it("room is full if another client join", async () => {
    //   try {
    //     const promises: Array<Promise<void>> = [];

    //     const totalBuyerSeller =
    //       simulationResponse.buyers.length + simulationResponse.sellers.length;

    //     for (let i = totalBuyerSeller; i < clientConnectionTotal; i++) {
    //       const sellerOrBuyer = getBuyerOrSellerUsername(simulationResponse);

    //       if (!sellerOrBuyer) {
    //         throw new Error("All seller or buyer is logged in");
    //       }
    //       const promise = new Promise<void>((resolve) => {
    //         testConnection.clientSockets[i].emit("loginToken", {
    //           token: simulationResponse.token,
    //           username: sellerOrBuyer.username,
    //         });
    //         testConnection.clientSockets[i].on("serverMessage", (response) => {
    //           expectHaveTemplateResponse(response);
    //           expect(response.status).to.be.equal(403);
    //           expect(response.message).to.contains("is full");
    //           expect(Object.keys(response.data)).to.have.lengthOf(0);

    //           resolve();
    //         });
    //       });
    //       promises.push(promise);
    //     }

    //     return Promise.all(promises);
    //   } catch (error) {
    //     errorThrowUtils(error);
    //   }
    // });

    it("user can ready", async () => {
      try {
        const promises: Array<Promise<void>> = [];
        const readyPromises: Array<Promise<void>> = [];

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

        for (let i = 0; i < totalBuyerSeller; i++) {
          countReceiveMessage.push(0);
          const promise = new Promise<void>((resolve) => {
            testConnection.clientSockets[i].emit("toggleReady");
            testConnection.clientSockets[i].on("serverMessage", (response) => {
              expectHaveTemplateResponse(response);
              expect(response.status).to.be.equal(200);
              expect(response.message).to.contains("set user to");
              expect(response.data).to.have.property("user");
              expect(response.data.user.isReady).to.be.true;
              expect(response.data).to.have.property("readyCount");

              resolve();
            });
          });

          const readyPromise = new Promise<void>((resolve) => {
            testConnection.clientSockets[i].on("readyCount", (response) => {
              expect(response).to.have.property("totalPlayer");
              expect(response.totalPlayer).to.be.equal(totalBuyerSeller);
              expect(response).to.have.property("numberOfReadyPlayer");
              expect(response.numberOfReadyPlayer).to.be.greaterThan(0);
              expect(response.numberOfReadyPlayer).to.be.lessThanOrEqual(
                totalBuyerSeller
              );

              countReceiveMessage[i] += 1;

              if (countReceiveMessage[i] >= totalBuyerSeller) {
                expect(response.numberOfReadyPlayer).to.be.equal(
                  response.totalPlayer
                );
                resolve();
              }
            });
          });

          readyPromises.push(readyPromise);
          promises.push(promise);
        }

        await Promise.all(promises);
        return Promise.all(readyPromises);
      } catch (error) {
        errorThrowUtils(error);
      }
    });

    it("admin can get ready count", (done) => {
      getAdminJwtToken().then((jwtToken) => {
        const url = `http://localhost:${config.server.port}/api/simulations/${simulationResponse.id}/readyCount`;
        axios
          .get(url, {
            headers: {
              Authorization: "Bearer " + jwtToken,
            },
          })
          .then((res) => {
            const readyData = res.data.data;
            expect(readyData).to.have.property("numberOfReadyPlayer");
            expect(readyData).to.have.property("totalPlayer");
            expect(readyData.numberOfReadyPlayer).to.be.equal(
              simulationResponse.buyers.length +
                simulationResponse.sellers.length
            );
            expect(readyData.totalPlayer).to.be.equal(
              readyData.numberOfReadyPlayer
            );
            done();
          });
      });
    });

    it("database have logged in user", async () => {
      try {
        const buyers = await Buyer.find({
          loginToken: simulationResponse.token,
        });
        const sellers = await Seller.find({
          loginToken: simulationResponse.token,
        });

        for (let i = 0; i < buyers.length; i++) {
          expect(buyers[i].isLoggedIn).to.be.true;
          expect(buyers[i].isReady).to.be.true;
          expect(buyers[i].socketId).to.be.not.null;
        }

        for (let i = 0; i < sellers.length; i++) {
          expect(sellers[i].isLoggedIn).to.be.true;
          expect(sellers[i].isReady).to.be.true;
          expect(sellers[i].socketId).to.be.not.null;
        }

        return;
      } catch (error) {
        errorThrowUtils(error);
      }
    });

    it("some user can unready", async () => {
      try {
        const promises: Array<Promise<void>> = [];
        const readyPromises: Array<Promise<void>> = [];

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

        for (let i = 0; i < Math.floor(totalBuyerSeller / 2); i++) {
          countReceiveMessage.push(0);
          const promise = new Promise<void>((resolve) => {
            testConnection.clientSockets[i].emit("toggleReady");
            testConnection.clientSockets[i].on("serverMessage", (response) => {
              expectHaveTemplateResponse(response);
              expect(response.status).to.be.equal(200);
              expect(response.message).to.contains("set user to false");
              expect(response.data).to.have.property("user");
              expect(response.data.user.isReady).to.be.false;
              expect(response.data).to.have.property("readyCount");

              resolve();
            });
          });

          const readyPromise = new Promise<void>((resolve) => {
            testConnection.clientSockets[i].on("readyCount", (response) => {
              expect(response).to.have.property("totalPlayer");
              expect(
                response.totalPlayer,
                "Total player is equal to simulation buyer + seller"
              ).to.be.equal(totalBuyerSeller);
              expect(response).to.have.property("numberOfReadyPlayer");
              expect(response.numberOfReadyPlayer).to.be.greaterThan(0);
              expect(response.numberOfReadyPlayer).to.be.lessThan(
                totalBuyerSeller
              );

              countReceiveMessage[i] += 1;

              if (countReceiveMessage[i] >= Math.floor(totalBuyerSeller / 2)) {
                expect(response.numberOfReadyPlayer).to.be.equal(
                  Math.floor(response.totalPlayer / 2)
                );
                resolve();
              }
            });
          });

          readyPromises.push(readyPromise);
          promises.push(promise);
        }

        await Promise.all(promises);
        return Promise.all(readyPromises);
      } catch (error) {
        errorThrowUtils(error);
      }
    });

    it("client can disconnect", async () => {
      try {
        const promises: Array<Promise<void>> = [];

        for (let i = 0; i < clientConnectionTotal; i++) {
          const promise = new Promise<void>((resolve) => {
            testConnection.clientSockets[i].on("disconnect", () => {
              resolve();
            });

            testConnection.clientSockets[i].disconnect();
          });
          promises.push(promise);
        }

        return Promise.all(promises);
      } catch (error) {
        errorThrowUtils(error);
      }
    });

    it("admin can finish session", async () => {
      const sessionResponse = sessionResponses[z];
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

      for (let i = 0; i < simulationResponse.buyers.length; i++) {
        simulationResponse.buyers[i].isLoggedIn = false;
      }

      for (let i = 0; i < simulationResponse.sellers.length; i++) {
        simulationResponse.sellers[i].isLoggedIn = false;
      }

      return;
    });

    it("database have logged out user", (done) => {
      setTimeout(async () => {
        try {
          const buyers = await Buyer.find({
            loginToken: simulationResponse.token,
          });
          const sellers = await Seller.find({
            loginToken: simulationResponse.token,
          });

          for (let i = 0; i < buyers.length; i++) {
            expect(buyers[i].isLoggedIn).to.be.false;
            expect(buyers[i].isReady).to.be.false;
            expect(buyers[i].socketId).to.be.null;
          }

          for (let i = 0; i < sellers.length; i++) {
            expect(sellers[i].isLoggedIn).to.be.false;
            expect(sellers[i].isReady).to.be.false;
            expect(sellers[i].socketId).to.be.null;
          }

          done();
        } catch (error) {
          errorThrowUtils(error);
          done();
        }
      }, 1000);
    }).timeout(3000);
  }

  it("can delete simulations", async () => {
    const response = await deleteSimulationTest(simulationResponse.id);
    expect(response.status).to.equal(200);
  });
});
