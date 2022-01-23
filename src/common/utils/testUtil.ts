import { expect } from "chai";
import { Socket } from "socket.io-client";
import { Connection } from "typeorm";
import { Server as HttpServer } from "http";
import { runApplication } from "../../app";
import config from "../../configHandler";
import { io as Client, Socket as SocketClient } from "socket.io-client";
import { errorThrowUtils } from "./error";

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
      if (!cs.disconnected) {
        cs.disconnect();
      }
    });

    testConnection.serverConnection.close((err) => {
      if (err instanceof Error) {
        throw err;
      }
    });

    testConnection.dbConnection?.close();
  } catch (error) {
    errorThrowUtils(error);
  }
}

export type TestConnection = {
  clientSockets: Array<Socket>;
  dbConnection: Connection | null;
  serverConnection: HttpServer;
};

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
