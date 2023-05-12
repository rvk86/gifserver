import GIFEncoder from "gif-encoder";
import puppeteer from "puppeteer";
import sharp = require("sharp");

const [width, height] = [600, 600];
const gifFrameCount = 80;
const gifInitialSpeed = 0.2;

function circleXY(r: number, theta: number) {
  theta = ((theta - 90) * Math.PI) / 180;
  return [Math.round(r * Math.cos(theta)), Math.round(-r * Math.sin(theta))];
}

export function getGif(website: string, filePath: string) {
  return new Promise<void>(async (resolve, reject) => {
    try {
      const browser = await puppeteer.launch({
        args: ["--use-gl=egl"],
      });
      const encoder = new GIFEncoder(width, height);
      encoder.setRepeat(0); // 0 for repeat, -1 for no-repeat
      encoder.setFrameRate(20);
      encoder.setQuality(2);
      var file = require("fs").createWriteStream(filePath);
      encoder.pipe(file);
      encoder.writeHeader();

      const page = await browser.newPage();
      page.setViewport({ width, height });
      await page.goto(website, {
        waitUntil: "domcontentloaded",
      });

      while (!(await page.evaluate(`window.introFinished`))) {
        console.log(`WAITING FOR INTRO`);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      let theta = 0;
      for (const index in Array(gifFrameCount).fill(0)) {
        const [x, y] = circleXY(2000, theta);
        await page.evaluate(`
        window.controls.autoRotate = false;
        window.camera.fov = 20;
        window.camera.position.x = ${x};
        window.camera.position.y = 0;
        window.camera.position.z = ${y};
      `);

        const ss = await page.screenshot();
        const frame = await sharp(ss, {
          limitInputPixels: false,
        })
          .raw()
          .toBuffer();

        encoder.addFrame(frame);

        const angle =
          parseInt(index) < gifFrameCount / 2
            ? (360 / gifFrameCount) * gifInitialSpeed
            : (360 / gifFrameCount) * (2 - gifInitialSpeed);
        theta = theta - angle;
      }

      encoder.finish();

      await browser.close();
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}
