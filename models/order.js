const mongoose = require("mongoose");
const Driver = require('./driver');


const orderSchema = new mongoose.Schema({
   customerName: { type: String },
   customerAddress: { type: String },
   customerPhoneNumber: { type: String },
   customerEmail: { type: String },
   paymentMethod: { type: String },
   totalPrice: { type: Number },
   orderDate: {type: Date },
   // creditCardDetails: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
   driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
   items: { type: Array, default: [] },
   status: { type: String, enum: ["READY FOR DELIVERY", "IN TRANSIT", "DELIVERED"], default: "READY FOR DELIVERY"},
   photo: { type: mongoose.Schema.Types.ObjectId, ref: 'Image' },
}, { timestamps: true });


module.exports = mongoose.model("Order", orderSchema);