import { Request, Response, Router } from "express";
const healthCheckRouter = Router();

/**
 * @swagger
 * /health-check:
 *  get:
 *    description: Test server response
 *    responses:
 *      '200':
 *        description: Server is fine
 */
healthCheckRouter.get("/health-check", (_: Request, res: Response) => {
  res.status(200).send("server ok");
});

export default healthCheckRouter;
