import { createCanvas, Image } from "canvas";
import express from "express";
import * as admin from "firebase-admin";
import { getStorage } from "firebase-admin/storage";
import { writeFileSync } from "fs";
import GIFEncoder from "gifencoder";
import puppeteer from "puppeteer";

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

function getGif(website: string) {
  return new Promise<Buffer>(async (resolve, reject) => {
    try {
      const encoder = new GIFEncoder(width, height);
      encoder.start();
      encoder.setRepeat(0); // 0 for repeat, -1 for no-repeat
      // @ts-ignore
      encoder.setFrameRate(20);
      encoder.setQuality(5);
      const fileStream = encoder.createReadStream();
      const chunks: any[] = [];
      fileStream.on("data", (chunk) => chunks.push(chunk));
      fileStream.once("close", () => resolve(Buffer.concat(chunks)));
      fileStream.once("error", (e) => reject(e));
      // @ts-ignore
      // console.log(puppeteer.defaultArgs());
      const browser = await puppeteer.launch({
        args: ["--use-gl=egl"],
      });
      const page = await browser.newPage();

      page.setViewport({ width, height });
      await page.goto(website, {
        waitUntil: "domcontentloaded",
      });
      await page.evaluate(() =>
        // @ts-ignore
        window.setControlSettings({ autoRotate: true, autoRotateSpeed: 0.1 })
      );
      await page.evaluate(() =>
        setTimeout(
          () =>
            // @ts-ignore
            window.setControlSettings({ autoRotate: true, autoRotateSpeed: 5 }),
          15000
        )
      );
      await page.waitForTimeout(100);

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // @ts-ignore
      while (!(await page.evaluate(() => window.fullCircle))) {
        const buffer = await page.screenshot();
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          encoder.addFrame(ctx as globalThis.CanvasRenderingContext2D);
        };
        img.src = buffer;
      }
      encoder.finish();
      await browser.close();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = app;
