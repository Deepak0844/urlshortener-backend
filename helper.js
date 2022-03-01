import bcrypt from "bcryptjs";
import { client } from "./index.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

//url shortener
async function ShortUrl(URL) {
  console.log(URL);
  return await client.db("URL").collection("Short_Url").findOne(URL);
}

async function saveUrl(shortUrl) {
  return await client.db("URL").collection("Short_Url").insertOne(shortUrl);
}

async function allUrl() {
  return await client.db("URL").collection("Short_Url").find({}).toArray();
}

async function updateCounter(shortId, counter) {
  return await client
    .db("URL")
    .collection("Short_Url")
    .updateOne({ shortId: shortId }, { $set: { clickCount: counter } });
}

async function clickPerDay() {
  //starting from 12am
  var start = new Date();
  start.setHours(0, 0, 0, 0);
  //ending at 23.59.59pm
  var end = new Date();
  end.setHours(23, 59, 59, 999);

  return await client
    .db("URL")
    .collection("Short_Url")
    .find({ date: { $gte: start, $lt: end } })
    .toArray();
}

async function getdata() {
  var d = new Date();
  d.setMonth(d.getMonth() - 1);
  return await client
    .db("URL")
    .collection("Short_Url")
    .find({ date: { $gte: d } })
    .toArray();
}
//for chart
async function getChart() {
  let month = [
    "",
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  return await client
    .db("URL")
    .collection("Short_Url")
    .aggregate([
      {
        $group: {
          _id: {
            $month: {
              $toDate: "$date",
            },
          },
          count: {
            $sum: 1,
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          count: 1,
          Month: {
            $arrayElemAt: [month, "$_id"],
          },
        },
      },
    ])
    .toArray();
}

//url shortener

//authentication
//generate hashed password
async function genPassword(password) {
  const NO_OF_ROUNDS = 10; //difficulties
  const salt = await bcrypt.genSalt(NO_OF_ROUNDS); //random string
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
}
//find user by email or  check user is avaliable
async function getUserByEmail(email) {
  return await client.db("auth").collection("users").findOne({ email });
}
//verify password is correct
async function verifyUser(password) {
  return await client
    .db("auth")
    .collection("users")
    .findOne({ password: password });
}

async function verifyToken(token) {
  return await client
    .db("auth")
    .collection("users")
    .findOne({ password: token });
}

async function createUser(data) {
  return await client.db("auth").collection("users").insertOne(data);
}

// after forgot password,here the token will update the existing password
async function saveToken(data) {
  let { email, token } = data;
  return await client
    .db("auth")
    .collection("users")
    .updateOne({ email }, { $set: { password: token } });
}
// new password will be updated
async function updateUser(userData) {
  const { email, password } = userData;
  console.log(email, password);
  return await client
    .db("auth")
    .collection("users")
    .updateOne({ email }, { $set: { password: password } });
}

//update token in database for verification
async function updateToken(tokenData) {
  const { _id, token } = tokenData;
  return await client
    .db("auth")
    .collection("users")
    .updateOne({ _id: _id }, { $set: { token: token } });
}
async function getUser(data) {
  return await client.db("auth").collection("users").findOne(data);
}

async function updateStatus(data) {
  const { _id, token } = data;
  return await client
    .db("auth")
    .collection("users")
    .updateOne({ _id }, { $set: { status: "active" }, $unset: { token } });
}

//send mail for verification
function Email(email, response, message) {
  var transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });

  var mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "Sending Email using Node.js",
    html: message,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      response.status(404).send("error");
    } else {
      response.send("password reset link has been sent to your email");
    }
  });
}
//authentication

export {
  saveUrl,
  ShortUrl,
  allUrl,
  updateCounter,
  clickPerDay,
  genPassword,
  createUser,
  getUserByEmail,
  saveToken,
  updateUser,
  verifyUser,
  verifyToken,
  Email,
  getdata,
  updateToken,
  getUser,
  updateStatus,
  getChart,
};
