const express = require('express');
const router = express.Router();
const session = require('express-session');
const { ObjectId } = require('mongodb');
const Driver = require('../models/driver');
const Order = require('../models/order');
const Image = require('../models/image');
const multer = require('multer');
const path = require('path');
const fs = require('fs')

router.use(express.static("/public"));
router.use('/uploads', express.static('uploads'))
router.use(session({
  secret: "", 
  resave: false,
  saveUninitialized: true
}))

var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname)
    }
});
const upload = multer({ storage });


// GET - All Orders
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().populate('driver')
        // check if a logged in user exists:
    if (req.session.hasOwnProperty("loggedInUser") === true) {
      
      const loggedInUser = await Driver.findById(req.session.loggedInUser._id)
      if (loggedInUser.order != null) {
        const previousOrder = await Order.findById(loggedInUser.order)
        return res.render("delivery.ejs", { orderInTransit: previousOrder, items: [], deliveryDriver: loggedInUser })
      }
      try {
        return res.render("session.ejs", { driver: loggedInUser, orders: orders })
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    } else {
        return res.render("login.ejs", { errorMessage: null })
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET - Filter by ID
router.get('/findOrder/:id', async (req, res) => {
    console.log(`GET BY ID CALLED: ${req.params.id}`);
    try {
      const Order = await Order.findById(req.params.id).populate("driver");
      console.log(Order);
      if (!Order) return res.status(404).json({ message: 'Order not found' });
      res.json(Order);
    } catch (error) {
      
      res.status(500).json({ message: error.message });
      
    }
  });
  

//CREATE DRIVER ACCOUNT 
router.post("/signup", async (req,res) => {
  console.log("DEBUG: Data from signup form:")
  console.log(req.body)

  const emailFromUI = req.body.textfieldEmail
  const passwordFromUI = req.body.textfieldPassword
  const nameFromUI = req.body.textfieldName
  const plateFromUI = req.body.textfieldPlate

  if (emailFromUI.length > 0 && passwordFromUI.length > 0 && nameFromUI.length > 0 && plateFromUI.length > 0) {
    const results = await Driver.find({email: emailFromUI})

    if (results.length === 0) {
        try {

          const newDriver = new Driver({
            email: emailFromUI,
            name: nameFromUI,
            plate: plateFromUI,
            order: null,
            password: passwordFromUI,
          });
            await newDriver.save()
            return res.render("login.ejs", { errorMessage: `Driver account created successfully!` })
        } catch (err) {
            //ALSO SEND ERROR MESSAGE HERE!
            return res.render("login.ejs", { errorMessage: `Unsuccessful: ${err}` })
        }       
    } else {
      return res.render("login.ejs", { errorMessage: "Account with that email already exists" })
    }
  } else {
    // return message to UI about filling out fields
    console.log("Unsuccessful: Please ensure all fields are filled out")
    return res.render("login.ejs", { errorMessage: "Unsuccessful: Please ensure all fields are filled out" })

  }
  
})


//LOGIN
router.post("/session", async (req,res)=>{
  console.log("DEBUG: Data from login form:")
  console.log(req.body)

  try {
      const results = await Driver.find({email:req.body.textfieldEmail})

      if (results.length === 0) { return res.send("ERROR: This user does not exist") }
      const driverFromMongoDB = results[0]

      if (driverFromMongoDB.password === req.body.textfieldPassword) {
          //Keep user logged in for future sessions
          const orders = await Order.find()
          req.session.loggedInUser = driverFromMongoDB
          if (driverFromMongoDB.order != null) {
            const previousOrder = await Order.findById(driverFromMongoDB.order)
            return res.render("delivery.ejs", { orderInTransit: previousOrder, items: [], deliveryDriver: driverFromMongoDB })
          }
          try {
            return res.render("session.ejs", { driver: driverFromMongoDB, orders: orders })
          } catch (err) {
            res.status(500).json({ message: err.message });
          }
      }       
      else {
          return res.send("ERROR: Incorrect username or password")
      }
  } catch (err) {
      return res.status(500).send(err.message)
  }   
})



router.get("/logout", (req,res) => {
  // delete the entire session
  req.session.destroy()
  console.log("LOGGED OUT!!! Redirecting you back to the / endpoint")
  return res.redirect("/")
})


// UPDATE / PATCH
router.patch('/selectOrder/:id', async (req, res) => {
    console.log(req.body.driverId);
    try {
      const driver = await Driver.findById(req.body.driverId);
      console.log(`driver found by id, id: ${driver._id}`)
      const orderInTransit = await Order.findByIdAndUpdate(req.params.id, {
        status: "IN TRANSIT",
        driver: driver._id
      }, { new: true });
      console.log(`ORDER IN TRANSIT ID ${ orderInTransit._id }`)
      const deliveryDriver = await Driver.findByIdAndUpdate(req.body.driverId, {
        order: orderInTransit._id
      }, {new: true });
      console.log(orderInTransit.driver);
      if (!orderInTransit) return res.status(404).json({ message: 'Order not found' });
      await orderInTransit.save();
      return res.render("delivery.ejs", { orderInTransit: orderInTransit, items: [], deliveryDriver: driver })
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

// UPDATE / PATCH
router.patch('/orderDelivered/:id', async (req, res) => {
  console.log(req.params.id);
  try {
    const orderDelivered = await Order.findByIdAndUpdate(req.params.id, {
      status: "DELIVERED"
    }, { new: true });
    const driver = await Driver.findByIdAndUpdate(orderDelivered.driver, {
      order: null
    }, { new: true });
    if (!orderDelivered) return res.status(404).json({ message: 'Order not found' });
    
    const orders = await Order.find()
    return res.render("session.ejs", { orders: orders, driver: driver})
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


router.patch('/deliveryCancelled/:id', async (req, res) => {
  console.log(req.params.id);
  try {
    const orderDelivered = await Order.findByIdAndUpdate(req.params.id, {
      status: "READY FOR DELIVERY",
      driver: null
    }, { new: true });
    const driver = await Driver.findByIdAndUpdate(req.body.driverId, {
      order: null
    }, { new: true });
    if (!orderDelivered) return res.status(404).json({ message: 'Order not found' });
    
    const orders = await Order.find()
    return res.render("session.ejs", { orders: orders, driver: driver})
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


router.post('/uploadImage', upload.single('imageOfFood'), async (req, res) => {
  console.log(`UPLOADCALLED: ${req.file.filename}`);
  try {

    const driver = Driver.findById(req.body.driverId)
    const newImage = new Image({
      name: req.file.filename,
      desc: req.body.desc,
      img: {
          data: fs.readFileSync(path.join('uploads/' + req.file.filename)),
          contentType: 'image/png'
      }
    })
    var savedImage = await newImage.save();
    console.log(`✅ SAVED IMAGE: ${savedImage._id}`);
    console.log(`🐤 ORDER ID: ${req.body.orderId}`);

    const orderWithPhoto = await Order.findByIdAndUpdate(req.body.orderId, {
      photo: savedImage._id
    }, { new: true });
    if (!orderWithPhoto) return res.status(404).json({ message: 'Order not found' });
    await orderWithPhoto.save();
    
    res.render("delivery.ejs", { orderInTransit: orderWithPhoto, items: [newImage], deliveryDriver: driver })
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: error.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
    try {
      const Order = await Order.findByIdAndDelete(req.params.id);
      if (!Order) return res.status(404).json({ message: 'Order not found' });
      res.json({ message: 'Order deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });


module.exports = router;
