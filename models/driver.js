const mongoose = require("mongoose");
const Order = require('./order');


const driverSchema = new mongoose.Schema({
   email: { type: String, required: true },
   name: { type: String, required: true },
   plate: { type: String, required: true },
   order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
   password: { type: String, required: true },
}, { timestamps: true });


module.exports = mongoose.model("Driver", driverSchema);