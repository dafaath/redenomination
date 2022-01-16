import { Request, Response, Router } from "express";
import { handleSuccessResponse } from "../common/utils/responseHandler";
const buyerRouter = Router();

buyerRouter.get("/api/", (_: Request, res: Response) => {
  handleSuccessResponse(res, 200, "server is fine");
});

export default buyerRouter;
