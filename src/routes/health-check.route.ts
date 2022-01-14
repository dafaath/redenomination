import { Request, Response, Router } from "express";
const healthCheckRouter = Router();

healthCheckRouter.get("/api/", (_: Request, res: Response) => {
  res.status(200).send("server ok");
});

export default healthCheckRouter;
