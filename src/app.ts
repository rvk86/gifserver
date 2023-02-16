import express from "express";
import * as admin from "firebase-admin";
import { getStorage } from "firebase-admin/storage";
import { writeFileSync } from "fs";
import { getGif } from "./utils";

admin.initializeApp({ storageBucket: "gs://mapmaker-330220.appspot.com" });
export const bucket = getStorage().bucket();
const db = admin.firestore();

const [width, height] = [500, 500];
const url =
  "http://localhost:9199/v0/b/mapmaker-staging.appspot.com/o/kyiv_cardanofoundation.html?alt=media&token=15cfe79d-5a1d-44f9-a062-f8c034d47c5b&skipIntro=1";
const locationCode = "CardanoThorPromo";

const app = express();
app.use(express.json());

app.get("/save-gif", async (req, res) => {
  try {
    const gif = await getGif(url as string);
    const gifFileName = `${locationCode}.gif`;
    writeFileSync(gifFileName, gif);
    res.status(200).send(gifFileName).end();
  } catch (e: any) {
    console.log(e.message);
    res.status(400).send(e.message).end();
  }
});

app.post("/save-gif", async (req, res) => {
  try {
    const { url, locationCode, turfId } = req.body;
    const gif = await getGif(url as string);
    const gifFileName = `${locationCode}.gif`;
    const gifFile = bucket.file(gifFileName);
    await gifFile.save(gif);
    await db
      .collection("turfs")
      .doc(turfId as string)
      .update({ gifFileName });
    res.status(200).send(gifFileName).end();
  } catch (e: any) {
    console.log(e.message);
    res.status(400).send(e.message).end();
  }
});

app.get("/", (req, res) => {
  res.status(200).send("OK").end();
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log("Press Ctrl+C to quit.");
});

module.exports = app;
