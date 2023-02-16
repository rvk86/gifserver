import GIFEncoder from "gif-encoder";
import puppeteer from "puppeteer";
import sharp = require("sharp");

const [width, height] = [800, 800];

export function getGif(website: string) {
  return new Promise<Buffer>(async (resolve, reject) => {
    try {
      const browser = await puppeteer.launch({
        args: ["--use-gl=egl"],
      });
      const encoder = new GIFEncoder(width, height);
      encoder.setRepeat(0); // 0 for repeat, -1 for no-repeat
      encoder.setDelay(3000);
      var file = require("fs").createWriteStream("img.gif");
      encoder.pipe(file);
      encoder.writeHeader();

      const page = await browser.newPage();
      page.setViewport({ width, height });
      await page.goto(website, {
        waitUntil: "domcontentloaded",
      });

      await page.waitForTimeout(200);

      await page.evaluate(() => {
        // @ts-ignore
        window.setControlSettings({ autoRotate: false });
        // @ts-ignore
        window.camera.position.x = 0;
        // @ts-ignore
        window.camera.position.y = 0;
        // @ts-ignore
        window.camera.position.z = 1500;
      });

      const frontSS = await page.screenshot();
      const front = await sharp(frontSS, {
        limitInputPixels: false,
      })
        .raw()
        .toBuffer();

      encoder.addFrame(front);
      // front.src = frontSS;
      // front.onload = () => {};

      await page.evaluate(() => {
        // @ts-ignore
        window.setControlSettings({ autoRotate: false });
        // @ts-ignore
        window.camera.position.x = 0;
        // @ts-ignore
        window.camera.position.y = 0;
        // @ts-ignore
        window.camera.position.z = -1500;
      });

      const backSS = await page.screenshot();
      const back = await sharp(backSS, {
        limitInputPixels: false,
      })
        .raw()
        .toBuffer();
      encoder.addFrame(back);

      encoder.finish();

      await browser.close();
    } catch (e) {
      reject(e);
    }
  });
}
