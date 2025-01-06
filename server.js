const express = require('express');
const app = express();
const mongoose = require('mongoose');
const port = process.env.PORT || 3000
const ordersRoutes = require('./routes/orders');
require("dotenv").config();
const bodyParser = require('body-parser');
const session = require('express-session');
var methodOverride = require('method-override');
const path = require('path');

app.use(session({
  secret: "the quick brown fox jumped over the lazy dog 1234567890",  // random string, used for configuring the session
  resave: false,
  saveUninitialized: true
}))

app.use(express.static(__dirname + '/public'));
app.use(methodOverride('_method'))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs")


mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error conneting to MongoDB:', err));


app.use('/', ordersRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}.`);
});
