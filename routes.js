import express from "express";
import PaymentController from "./modules/payment/payment.controller.js";
import { middleware } from "./middlewares/auth.middleware.js";

const route = express.Router();

route.post("/payment/qris", middleware, PaymentController.createPaymentQRIS);

export default route;
