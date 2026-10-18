import { Router, type IRouter } from "express";
import healthRouter from "./health";
import businessesRouter from "./businesses";
import demoOtpRouter from "./demoOtp";
import bookingsRouter from "./bookings";
import pushTokensRouter from "./pushTokens";

const router: IRouter = Router();

router.use(healthRouter);
router.use(businessesRouter);
router.use(bookingsRouter);
router.use(pushTokensRouter);
router.use(demoOtpRouter);

export default router;
