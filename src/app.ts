import { createCanvas, Image } from "canvas";
import express from 'express';
import * as admin from "firebase-admin";
import { getStorage } from "firebase-admin/storage";
import GIFEncoder from "gifencoder";
import puppeteer from "puppeteer";

admin.initializeApp({ storageBucket: "gs://mapmaker-330220.appspot.com" });
export const bucket = getStorage().bucket();

const [width, height] = [500, 500];
const url =
  "https://cardanospace.mypinata.cloud/ipfs/Qme8kVR1iqQWGtWrZpfzbkEN7ueXR7KqyeKyvYkNtMEJBA";

const app = express();

app.get('/', async (req, res) => {
  const gif = await getGif(url);
  const gifFile = bucket.file(`ny.gif`);
  await gifFile.save(gif);
  gifFile.makePublic();
  console.log("URL", gifFile.publicUrl());
  res.status(200).send(gifFile.publicUrl()).end();
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});


function getGif(website: string) {
  return new Promise<Buffer>(async (resolve, reject) => {
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
    await page.goto(website + "?skipIntro=1", {
      waitUntil: "domcontentloaded",
    });
    await page.evaluate(() =>
      // @ts-ignore
      window.setControlSettings({ autoRotate: true, autoRotateSpeed: 0.2 })
    );
    await page.evaluate(() =>
      setTimeout(
        () =>
          // @ts-ignore
          window.setControlSettings({ autoRotate: true, autoRotateSpeed: 4 }),
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
  });
}


module.exports = app;