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

const [width, height] = [600, 600];
const gifFrameCount = 80;
const gifInitialSpeed = 0.2;
const url =
  "https://storage.googleapis.com/mapmaker-330220.appspot.com/8FX42976%2BHR.html?skipIntro=true";
const fileName = "test";

const app = express();
app.use(express.json());

app.get("/save-gif", async (req, res) => {
  try {
    const gif = await getGif(url as string);
    const gifFileName = `${fileName}.gif`;
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

function circleXY(r: number, theta: number) {
  theta = ((theta - 90) * Math.PI) / 180;
  return [Math.round(r * Math.cos(theta)), Math.round(-r * Math.sin(theta))];
}

function getGif(website: string) {
  return new Promise<Buffer>(async (resolve, reject) => {
    try {
      const encoder = new GIFEncoder(width, height);
      encoder.start();
      encoder.setRepeat(0); // 0 for repeat, -1 for no-repeat
      // @ts-ignore
      encoder.setFrameRate(20);
      encoder.setQuality(2);
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
      while (!(await page.evaluate(`window.introFinished`))) {
        console.log(`WAITING FOR INTRO`);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      let theta = 0;
      for (const index in Array(gifFrameCount).fill(0)) {
        const [x, y] = circleXY(2000, theta);
        await page.evaluate(`
                window.controls.autoRotate = false;
                window.camera.fov = 55;
                window.camera.position.x = ${x};
                window.camera.position.y = 0;
                window.camera.position.z = ${y};
              `);

        const buffer = await page.screenshot();
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          encoder.addFrame(
            ctx as unknown as globalThis.CanvasRenderingContext2D
          );
        };
        img.src = buffer;

        const angle =
          parseInt(index) < gifFrameCount / 2
            ? (360 / gifFrameCount) * gifInitialSpeed
            : (360 / gifFrameCount) * (2 - gifInitialSpeed);
        theta = theta - angle;
      }

      encoder.finish();
      await browser.close();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = app;
