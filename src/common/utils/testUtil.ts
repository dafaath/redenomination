import { expect } from "chai";
import { Socket } from "socket.io-client";
import { Connection } from "typeorm";
import { Server as HttpServer } from "http";
import { runApplication } from "../../app";
import config from "../../configHandler";
import { io as Client, Socket as SocketClient } from "socket.io-client";
import { errorThrowUtils } from "./error";
import axios, { AxiosResponse } from "axios";
import log from "./logger";
import { Server } from "socket.io";
import { getRandomNumberBetween } from "./other";
import { PhaseType } from "../../db/entities/phase.entity";

export function expectHaveTemplateResponse(response: unknown) {
  expect(response).to.not.undefined;
  expect(response).to.be.an("object");
  expect(response).to.have.property("status");
  expect(response).to.have.property("message");
  expect(response).to.have.property("data");
}
export async function HandleBeforeTest(
  clientConnectionTotal: number
): Promise<TestConnection | undefined> {
  try {
    const connections = await runApplication();

    const clientSockets: Array<SocketClient> = [];
    if (!connections) {
      throw new Error("Connections failed to start");
    }

    const port = config.server.port;
    for (let i = 0; i < clientConnectionTotal; i++) {
      const clientSocket = Client(`http://localhost:${port}`);
      clientSockets.push(clientSocket);
    }
    const promises: Array<Promise<void>> = clientSockets.map(async (cs) => {
      return new Promise((resolve) => {
        cs.on("connect", () => {
          resolve();
        });
      });
    });

    await Promise.all(promises);

    const testConnection: TestConnection = {
      dbConnection: connections.dbConnection,
      serverConnection: connections.serverConnection,
      ioConnection: connections.ioConnection,
      clientSockets: clientSockets,
    };

    return testConnection;
  } catch (error) {
    errorThrowUtils(error);
  }
}

export function handleAfterTest(testConnection: TestConnection) {
  try {
    testConnection.clientSockets.forEach((cs) => {
      cs.disconnect();
    });

    testConnection.serverConnection.close((err) => {
      if (err) {
        log.error(err);
        throw err;
      }
      log.info("finished closing server");
    });

    testConnection.ioConnection.removeAllListeners();

    testConnection.dbConnection?.close().then(() => {
      log.info("finished closing database");
    });
  } catch (error) {
    errorThrowUtils(error);
  }
}

export type TestConnection = {
  clientSockets: Array<Socket>;
  dbConnection: Connection | null;
  ioConnection: Server;
  serverConnection: HttpServer;
};

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface SimulationResponse {
  token: string;
  simulationType: string;
  goodsType: string;
  goodsName: string;
  inflationType: string;
  participantNumber: number;
  avgTrxOccurrence: number;
  avgTrxPrice: number;
  timer: number;
  timeCreated: string;
  timeLastRun: string;
  buyers: BuyerInterface[];
  sellers: SellerInterface[];
  goodsPic: null;
  id: string;
}

export interface BuyerInterface {
  loginToken: string;
  unitValue: number;
  socketId: null;
  id: string;
  isLoggedIn: boolean;
}

export interface SellerInterface {
  loginToken: string;
  socketId: null;
  id: string;
  isLoggedIn: boolean;
  unitCost: number;
}

export async function getAdminJwtToken() {
  const adminLoginResponse = await axios.post(
    `http://localhost:${config.server.port}/api/sessions/admins`,
    {
      password: "test_password",
    }
  );
  expect(adminLoginResponse.data.data).to.have.property("jwtToken");
  return adminLoginResponse.data.data.jwtToken;
}

export async function createSimulationTest(): Promise<SimulationResponse> {
  const jwtToken = await getAdminJwtToken();
  const response = await axios.post(
    `http://localhost:${config.server.port}/api/simulations`,
    {
      simulationType: "posted offer",
      goodsType: "goodsType",
      goodsName: "goodsName",
      inflationType: "inflationType",
      participantNumber: 10,
      timer: 0,
      seller: [
        {
          unitCost: 4000,
        },
        {
          unitCost: 6000,
        },
        {
          unitCost: 7000,
        },
      ],
      buyer: [
        {
          unitValue: 8000,
        },
        {
          unitValue: 9000,
        },
        {
          unitValue: 10000,
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    }
  );
  return response.data.data;
}

export interface SessionResponse {
  sessionType: string;
  avgTrxOccurrence: number;
  avgTrxPrice: number;
  timer: number;
  timeCreated: string;
  timeLastRun: string;
  simulation: Simulation;
  phases: Phase[];
  id: string;
  isRunning: boolean;
}

export interface Phase {
  phaseType: string;
  avgTrxOccurrence: number;
  avgTrxPrice: number;
  timer: number;
  timeCreated: string;
  timeLastRun: string;
  id: string;
  isRunning: boolean;
}

export interface Simulation {
  id: string;
  token: string;
  simulationType: string;
  goodsType: string;
  goodsName: string;
  goodsPic: null;
  inflationType: string;
  participantNumber: number;
  avgTrxOccurrence: string;
  avgTrxPrice: string;
  timer: number;
  timeCreated: string;
  timeLastRun: string;
}

export async function createSessionTest(
  simulationId: string
): Promise<SessionResponse> {
  const jwtToken = await getAdminJwtToken();

  const response = await axios.post(
    `http://localhost:${config.server.port}/api/sessions`,
    {
      simulationID: simulationId,
      sessionType: "sessionType",
      timer: 1,
    },
    {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    }
  );
  return response.data.data;
}
export async function deleteSimulationTest(id: string): Promise<AxiosResponse> {
  const jwtToken = await getAdminJwtToken();

  const response = await axios.delete(
    `http://localhost:${config.server.port}/api/simulations/${id}`,
    {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    }
  );
  return response;
}

export function getRandomArrayOfPhaseType(length: number) {
  const phaseTypes = [
    PhaseType.PRE_REDENOM_PRICE,
    PhaseType.TRANSITION_PRICE,
    PhaseType.POST_REDENOM_PRICE,
  ];
  const returnPhaseType = [];
  for (let i = 0; i < length; i++) {
    const randomNumber = getRandomNumberBetween(0, phaseTypes.length - 1);
    const randomPhaseType = phaseTypes[randomNumber];
    returnPhaseType.push(randomPhaseType);
  }

  return returnPhaseType;
}

export async function adminRunSessionTest(sessionId: string) {
  const jwtToken = await getAdminJwtToken();

  const response = await axios.post(
    `http://localhost:${config.server.port}/api/sessions/${sessionId}/runs`,
    {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    }
  );

  return response;
}
