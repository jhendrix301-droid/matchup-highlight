import iconv from 'iconv-lite';
import fs from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  const url = 'https://npb.jp/bis/players/41245138.html';
  const { data } = await axios.get(url, { 
    responseType: 'arraybuffer',
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Encoding': 'identity' } 
  });
  
  const decodedHtml = iconv.decode(Buffer.from(data), 'Shift_JIS');
  const throwMatch = decodedHtml.match(/(右|左|両)投/);
  const batMatch = decodedHtml.match(/(右|左|両)打/);
  console.log("Throw:", throwMatch ? throwMatch[1] : null, "Bat:", batMatch ? batMatch[1] : null);
}
test();
