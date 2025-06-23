import express from "express";
import PaymentController from "./modules/payment/payment.controller";
import { middleware } from "./middlewares/auth.middleware";

const route = express.Router();

route.post("/payment/qris", middleware, PaymentController.createPaymentQRIS);

export default route;
