"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const healthCheckRouter = (0, express_1.Router)();
/**
 * @swagger
 * /:
 *  get:
 *    description: Test server response
 *    tag: ["other"]
 *    responses:
 *      '200':
 *        description: Server is fine
 */
healthCheckRouter.get("/", (_, res) => {
    res.status(200).send("server ok");
});
/**
 * @swagger
 * /health-check:
 *  get:
 *    description: Test server response
 *    tag: ["other"]
 *    responses:
 *      '200':
 *        description: Server is fine
 */
healthCheckRouter.get("/health-check", (_, res) => {
    res.status(200).send("server ok");
});
exports.default = healthCheckRouter;
