import { Request, Response, Router } from "express";
import { handleSuccessResponse } from "../common/utils/responseHandler";
const healthCheckRouter = Router();

healthCheckRouter.get("/api/", (_: Request, res: Response) => {
  handleSuccessResponse(res, 200, "server is fine");
});

export default healthCheckRouter;
