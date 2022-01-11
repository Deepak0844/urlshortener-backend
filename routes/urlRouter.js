import express from "express";
import {
  ShortUrl,
  saveUrl,
  allUrl,
  updateCounter,
  clickPerDay,
  getdata,
  getChart,
} from "../helper.js";
import shortId from "shortid";
import { auth } from "../middleware/auth.js";
const router = express.Router();

//url shortner
//get the long url from request body
router
  .route("/")
  .post(auth, async (request, response) => {
    const { url } = request.body;
    const date = new Date();
    if (!url) {
      //if url is not provided
      response.send({ message: "url must be provide" });
      return;
    }
    const urlExist = await ShortUrl({ url: url }); //checks if the url already exist in database
    console.log(urlExist);
    if (urlExist) {
      response.send({
        shortUrl: `${request.headers.host}/url/${urlExist.shortId}`,
      }); //if exist in database stored shortid will be sended
      return;
    }
    const shortUrl = {
      url: url,
      shortId: shortId.generate(),
      date: date,
      clickCount: 0,
    }; // if not exist new shortid will be generated
    const result = await saveUrl(shortUrl);
    console.log(shortUrl);

    response.send({
      shortUrl: `${request.headers.host}/url/${shortUrl.shortId}`,
    });
  })
  //display all url
  .get(auth, async (request, response) => {
    const result = await allUrl();
    console.log(result.length);
    response.send(result);
  });

// search for shortid available in database if available orginal url is rendered
router.route("/:shortId").get(auth, async (request, response) => {
  const { shortId } = request.params;
  let counter = 0;
  const result = await ShortUrl({ shortId: shortId });
  if (!result) {
    //if shortid is not valid or not available in database
    response.send({ message: "short url does not exist" });
    return;
  }
  //
  counter = result.clickCount;
  //
  counter++;
  console.log(result);
  const update = await updateCounter(shortId, counter);
  response.redirect(result.url); // shortid is valid it redirects to actual url
});

//show url created per day
router.route("/created/perday").get(auth, async (request, response) => {
  const result = await clickPerDay();
  console.log(result);
  response.send(result);
});

//created per month
router.route("/created/permonth").get(auth, async (request, response) => {
  const result = await getdata();
  response.send(result);
});

//it show how many url created month wise
router.route("/data/chart").get(auth, async (request, response) => {
  const result = await getChart();
  response.send(result);
});
export const urlRouter = router;
