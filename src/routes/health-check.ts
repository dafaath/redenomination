import { Request, Response, Router } from "express";
const healthCheckRouter = Router();

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
healthCheckRouter.get("/", (_: Request, res: Response) => {
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
healthCheckRouter.get("/health-check", (_: Request, res: Response) => {
  res.status(200).send("server ok");
});

export default healthCheckRouter;
