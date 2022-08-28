require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const fileUpload = require("express-fileupload");
const morgan = require("morgan")
const helmet = require('helmet');
const compression = require('compression');

const app = express();

app.use(express.json());
// app.use(cors({
//   origin: "https://frontend-emedicine-platform.herokuapp.com",
//   credentials: true,
// }));

var whitelist = ['https://frontend-emedicine-platform.herokuapp.com', 'https://frontend-emedicine-platform.netlify.app/']
var corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}

app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"))
app.use(cookieParser());
app.use(
  fileUpload({
    useTempFiles: true,
  })
);
app.use(helmet())
app.use(compression());

app.use("/user",cors(corsOptions), require("./routes/userRouter"));
app.use("/api",cors(corsOptions), require("./routes/categoryRouter"));
app.use("/api",cors(corsOptions), require("./routes/productRouter"));
app.use("/api",cors(corsOptions), require("./routes/upload"));
app.use("/api",cors(corsOptions), require("./routes/orderRouter"));

const URI = process.env.MONGO_URL;
const PORT = process.env.PORT;

mongoose.connect(
  URI,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    autoIndex: false,
  },
  (err) => {
    if (err) throw err;
    console.log("DATABASE CONNECTED...");
  }
);

app.listen(PORT, () => {
  console.log(`SERVER IS CONNECTED TO PORT ${PORT}`);
});

app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/index.html');
  });

app.use(function (req, res, next) {
  res.status(404);
  res.send('404 Not Found');
})
