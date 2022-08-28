const User = require("../models/userModel");
const Order = require("../models/orderModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const transporter = require('../config/emailConfig');

const userCTRL = {
  register: async (req, res) => {
    try {
      const { fullName, userName, email, password, rePassword, role, shopName } =
        req.body;

      if (!fullName || !userName || !email || !password || !rePassword) {
        return res.status(400).json({ msg: "Invalid Creadentials." });
      }
      const existingUser = await User.findOne({ userName });
      if (existingUser) {
        return res.status(400).json({ msg: "User Already Exists." });
      }
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ msg: "Email Already Exists." });
      }
      if(shopName){
      const existingShop = await User.findOne({ shopName });
      console.log(existingShop);
      if (existingShop) {
        return res.status(400).json({ msg: "Medical Store Already Exists." });
      }}

      if (password.length < 6) {
        return res
          .status(400)
          .json({ msg: "Password Must be 6 Lengths Long." });
      }
      if (password !== rePassword) {
        return res.status(400).json({ msg: "Password Doesn't Match." });
      }
      const hashPassword = await bcrypt.hash(password, 10);
      const newUser = new User({
        fullName,
        userName,
        email,
        password: hashPassword,
        role,
        shopName,
      });

      await newUser.save();
      const accessToken = createAccessToken({ id: newUser._id });
      const refreshToken = createRefreshToken({ id: newUser._id });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        // secure: true,
        // sameSite: "none",
      });
      const secret = newUser._id + process.env.ACCESS_TOKEN_SECRET;
      const token = jwt.sign({ userID: newUser._id }, secret, { expiresIn: '15m' });
      const link = `https://frontend-emedicine-platform.herokuapp.com/verify-user/${newUser._id}/${token}`;

      let info = await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Account Verification',
        html: `
                  <h1> Account Verification </h1> <br/>
                  <h2>
                      <a href="${link}">Click Here</a> to Verify Your Account</h2>`
      });
      res.status(200).json({ status: "success", msg: "Account Verification  Link Sent Successfully, Check Your Mail", info, accessToken, newUser })
      // res.json({ accessToken, newUser });
    } catch (error) {
      return res.status(500).json({ msg: error.message });
    }
  },
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ msg: "Invalid Credentials." });
      }
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ msg: "User Doesn't Exists." });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ msg: "Password Doesn't Match." });
      }

      if (user.status === false) {
        const secret = user._id + process.env.ACCESS_TOKEN_SECRET;
        const token = jwt.sign({ userID: user._id }, secret, { expiresIn: '15m' });
        const link = `https://frontend-emedicine-platform.herokuapp.com/verify-user/${user._id}/${token}`;
        // console.log(link)

        // console.log("<------------------------------------------>")

        let info = await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: user.email,
          subject: 'Account Verification',
          html: `
                    <h1> Account Verification </h1> <br/>
                    <h2>
                        <a href="${link}">Click Here</a> to Verify Your Account</h2>`
        });

        res.status(200).json({ status: "success", msg: "Account Verification  Link Sent Successfully, Check Your Mail", info, user })
      };

      if (user.status === true) {
        const accessToken = createAccessToken({ id: user._id });
        const refreshToken = createRefreshToken({ id: user._id });

        res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          // secure: true,
          // sameSite: "none",
        });

        res.json({ accessToken, user, msg: `Welcome, ${user.userName}` });
      }

    } catch (error) {
      return res.status(500).json({ msg: error.message });
    }
  },
  refreshToken: async (req, res) => {
    const rf_token = req.cookies.refreshToken;
    if (!rf_token) {
      return res.status(400).json({ msg: "Please Login or Register." });
    }
    jwt.verify(rf_token, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
      if (err) {
        return res.status(400).json({ msg: "Please Login or Register." });
      }
      const accessToken = createAccessToken({ id: user.id });

      res.json({ accessToken });
    });
  },
  logout: async (req, res) => {
    try {
      res.clearCookie("refreshToken", {
        httpOnly: true,
        // expires: new Date(0),
        // secure: true,
        // sameSite: "none",
      });
      return res.json({ msg: "Logged Out." });
    } catch (error) {
      return res.status(500).json({ msg: error.message });
    }
  },
  addCart: async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(400).json({ msg: "User does not exist." });

      await User.findOneAndUpdate(
        { _id: req.user.id },
        {
          cart: req.body.cart,
        }
      );

      return res.json({ msg: "Added to cart" });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
  getUser: async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select("-password");
      if (!user) {
        return res.status(400).json({ msg: "User Doesn't Exists." });
      }
      res.json({ user });
    } catch (error) {
      return res.status(500).json({ msg: error.message });
    }
  },
  history: async (req, res) => {
    try {
      const history = await Order.find({ user_id: req.user.id });

      res.json({ history });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
  updateUser: async (req, res) => {
    try {
      const { fullName, password, rePassword, images, shopName } = req.body;
      if (!fullName || !password || !rePassword) {
        return res.status(400).json({ msg: "Invalid Creadentials" });
      }
      if (password.length < 4) {
        return res.status(400).json({ msg: "Password must be 4 lengths long" });
      }
      if (password !== rePassword) {
        return res.status(400).json({ msg: "Password Doesn't Match" });
      }
      const hashPass = await bcrypt.hash(password, 10);
      await User.findOneAndUpdate(
        { _id: req.params.id },
        {
          fullName,
          password: hashPass,
          images,
          shopName,
        }
      );
      res.json({ msg: "profile updated" });
    } catch (error) {
      return res.status(500).json({ msg: error.message });
    }
  },
  sendUserPaswordResetEmail: async (req, res) => {
    try {
      const { email } = req.body;
      if (email) {
        const user = await User.findOne({ email: email });
        if (user) {
          const secret = user._id + process.env.ACCESS_TOKEN_SECRET;
          const token = jwt.sign({ userID: user._id }, secret, { expiresIn: '15m' });
          const link = `https://frontend-emedicine-platform.herokuapp.com/reset-password/${user._id}/${token}`;
          console.log(link)

          console.log("<------------------------------------------>")

          let info = await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject: 'Password Reset Link',
            html: `
                    <h1>Password Reset Link</h1> <br/>
                    <h2>
                        <a href="${link}">Click Here</a> to Reset Your Password</h2>`
          });

          res.status(200).json({ status: "success", msg: "Password Reset Link Sent Successfully, Check Your Mail", info });
        } else {
          res.status(400).json({ status: "failed", msg: "Email doesn't exist" });
        }
      } else {
        res.status(400).json({ status: "failed", msg: "Email field is required" })
      }
    } catch (error) {
      return res.status(500).json({ status: "failed", msg: error.message })
    }
  },
  resetUserPassword: async (req, res) => {
    try {
      const { password, password_confirmation } = req.body;
      const { id, token } = req.params;

      const user = await User.findById(id);
      const newSecret = user._id + process.env.ACCESS_TOKEN_SECRET;
      jwt.verify(token, newSecret)
      if (password && password_confirmation) {
        if (password.length < 6) return res.status(400).json({ status: "failed", msg: "Password must be at least 6 characters." })
        if (password === password_confirmation) {

          const salt = await bcrypt.genSalt(12);
          const hashedPassword = await bcrypt.hash(password, salt);
          await User.findByIdAndUpdate(user._id, { $set: { password: hashedPassword } });

          res.status(200).json({ status: "success", msg: "Password Reset Successfully" });

        } else {
          res.status(400).json({ status: "failed", msg: "Password and Confirmation Password Doesn't Match" });
        }
      } else {
        res.status(400).json({ status: "failed", msg: "All fields are required" });
      }
    } catch (error) {
      res.status(500).send({ "status": "failed", "message": error.message })
    }
  },
  verifyUser: async (req, res) => {
    try {
      const { id, token } = req.params;
      const user = await User.findById(id);
      const newSecret = user._id + process.env.ACCESS_TOKEN_SECRET;
      jwt.verify(token, newSecret)
      if (user) {
        const newUser = await User.findByIdAndUpdate(user._id, { $set: { status: true } });
        res.status(200).json({ status: "success", msg: "User Verified Successfully", newUser });
      } else {
        res.status(400).json({ status: "failed", msg: "User Doesn't Exists" });
      }
    } catch (error) {
      res.status(500).send({ status: "failed", msg: error.message })
    }
  },
  approveVendor: async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id })
        if (user.vendorStatus === false) {
            const newUser = await User.findOneAndUpdate({ _id: user._id }, {
              vendorStatus: true
            }, { new: true })
            res.json({
                status: "success",
                msg: "Vendor approved!",
                newUser: {
                    ...newUser._doc
                }
            })
        } else {
            const newUser = await User.findOneAndUpdate({ _id: user._id }, {
              vendorStatus: false
            }, { new: true })
            res.json({
                status: "success",
                msg: "Vendor not approved!",
                newUser: {
                    ...newUser._doc
                }
            })
        }
    } catch (error) {
        return res.status(500).json({ status: "failed", msg: error.message })
    }
},
};

const createAccessToken = (user) => {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1d" });
};

const createRefreshToken = (user) => {
  return jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
};

module.exports = userCTRL;
