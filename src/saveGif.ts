import { writeFileSync } from "fs";
import { getGif } from "./utils";

const url = process.argv[2];
const filePath = process.argv[3];
console.log(url);
console.log(filePath);
getGif(url).then((gif) => {
  console.log("SUCCESS");
  writeFileSync(filePath, gif);
});