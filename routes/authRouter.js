import express from "express";
import bcrypt from "bcryptjs";
import {
  genPassword,
  createUser,
  getUserByEmail,
  saveToken,
  updateUser,
  verifyUser,
  verifyToken,
  Email,
  updateToken,
  getUser,
  updateStatus,
} from "../helper.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { auth } from "../middleware/auth.js";

dotenv.config();
const router = express.Router();

router.route("/").get(async (request, respond) => {
  respond.send("Password Reset");
});

//signup user - post
router.route("/signup").post(async (request, response) => {
  const { email, firstName, lastName, password } = request.body;
  const emailFromDB = await getUserByEmail(email); //check whether user already exist

  if (emailFromDB) {
    //if user name already exist
    response.status(401).send({ message: "email already exists " });
    return;
  }

  if (!email) {
    response.status(401).send({ message: "email should be provided" });
    return;
  }

  if (!firstName) {
    response.status(401).send({ message: "first name should be provided" });
    return;
  }
  if (!lastName) {
    response.status(401).send({ message: "last name should be provided" });
    return;
  }
  if (password.length < 8) {
    //check if the password length is greater than or equal to 8
    response.status(401).send({ message: "password must be longer" });
    return;
  }
  if (
    !/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@!#%&]).{8,}$/g.test(password)
  ) {
    response.status(401).send({ message: "Password pattern does not match" });
    return;
  }
  const hashedPassword = await genPassword(password);
  const result = await createUser({
    email,
    firstName,
    lastName,
    status: "pending", //
    password: hashedPassword,
  });
  //
  const getData = await getUserByEmail(email);
  const { _id } = getData;
  const token = jwt.sign({ id: _id }, process.env.SECRET_KEY);
  const storeToken = await updateToken({ _id, token });
  const link = `https://authhelper.herokuapp.com/account-verification/${token}`;
  console.log("token", token);
  const message = `
  <h2>Just one more step...</h2>
  <h3>hi ${firstName}</h3>
  <p>Click the link below to activate your account</p>
  <a href=${link}>complete verification</a>
`;

  const mail = Email(email, response, message);
});

router.route("/account-verification/:token").get(async (request, response) => {
  const { token } = request.params;
  try {
    const result = jwt.verify(token, process.env.SECRET_KEY);
    const getData = await getUser({ token: token });
    if (getData) {
      const { _id, token } = getData;
      const statusChange = await updateStatus({ _id: _id, token: token });
      response.send({ message: "Account Activated Successfully" });
      // response.redirect("https://account-activated-successfully.netlify.app/");
    } else {
      response.status(400).send({ message: "Link Expired" });
    }
  } catch (error) {
    response.status(400).send(error);
  }
});

//login user - post
router.route("/signin").post(async (request, response) => {
  const { email, password } = request.body;
  const emailFromDB = await getUserByEmail(email);

  if (!emailFromDB) {
    //if user does not exist
    response.status(401).send({ message: "Invalid credentials" });
    return;
  }

  //
  //if the account is not activated its show error message
  if (emailFromDB.status !== "active") {
    //if user does not exist
    response
      .status(401)
      .send({ message: "Pending Account. Please Verify Your Email!" });
    return;
  }
  //

  const storedPassword = emailFromDB.password;
  console.log("password", storedPassword);

  const isPasswordMatch = await bcrypt.compare(password, storedPassword); //comparing input password with existing password
  console.log("password", isPasswordMatch);

  if (isPasswordMatch) {
    const token = jwt.sign({ id: emailFromDB._id }, process.env.SECRET_KEY); //,{expiresIn:"3hours"}
    response.send({
      message: "Successfully logged in",
      token: token,
      emailFromDB,
    }); //if password match
  } else {
    response.status(401).send({ message: "Invalid credentials" }); //if password does not match
  }
});

//forget password
router.route("/forgot-password").post(async (request, response) => {
  const { email } = request.body;
  const emailFromDB = await getUserByEmail(email);

  if (emailFromDB.status !== "active") {
    //if user does not exist
    response
      .status(401)
      .send({ message: "Your account is not activated yet.Activation link has been send to your email already. kindly check it " });
    return;
  }

  if (!emailFromDB) {
    //if user does not exist
    response.status(401).send({ message: "Email id does not exist" });
    return;
  }

  // If the user is valid, token  is  generated for the user
  const token = jwt.sign({ id: emailFromDB._id }, process.env.SECRET_KEY);

  //  The generated token will replace the old password for later verification
  const replacePassword = await saveToken({ email, token });

  // Email
  // const link = `http://localhost:3000/forgot-password/verify/${token}`;
  const link = `https://authhelper.herokuapp.com/forgot-password/verify/${token}`;
  const message = `<h3>Hi ${emailFromDB.firstName},</h3>
  <p>Forgot your password?</p>
  <p>To reset your password, click on the link below</p>
  <a href=${link}>change password</a>
`;
  // Email(token, email);
  const mail = Email(email, response, message);
  // Using nodemailer the password reset link will be sent to the registered Email id

  // return response.send({
  //   token,
  //   message: "Reset password link send to your email id",
  // });
});

// After clicking the link in the email,which redirects to another page
router.route("/forgot-password/verify").get(async (request, response) => {
  // From the mail link the token was taken and it is placed in the header for further verification
  const token = await request.header("x-auth-token");

  const password = token;
  console.log("password", password);

  const tokenVerify = await verifyUser(password);

  // Using the token the user is verified in which the token replaced the old password before

  if (!tokenVerify) {
    //    If the token does not match
    return response.status(400).send({ message: "Invalid Credentials" });
  }
  response.send({ message: "Matched" });
});

router.route("/change-password").post(async (request, response) => {
  {
    // After the verification the new password is taken from the body of the request
    const { password, token } = request.body;

    if (password.length < 8) {
      response.status(401).send({ msg: "Password Must be longer" });
      return;
    }
    if (
      !/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@!#%&]).{8,}$/g.test(password)
    ) {
      response.status(401).send({ message: "Password pattern does not match" });
      return;
    }

    const data = await verifyToken(token);
    // The user is again verified using the same token which was sent before

    if (!data) {
      response.status(401).send({
        message: "link has been expired Please go back to forget password page",
      });
      return;
    }
    const { email } = data;

    // after the necessary verification the password is encrypted
    const hashedPassword = await genPassword(password);

    // After the generation of hashed password it will replace the token which is stored as a password
    const passwordUpdate = await updateUser({
      email,
      password: hashedPassword,
    });
    const result = await getUserByEmail(email);
    console.log("result", result);
    response.send({ message: "password changed successfully" });
  }
});

export const authRouter = router;
