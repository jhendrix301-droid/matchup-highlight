import axios from 'axios';
import * as cheerio from 'cheerio';

const url = 'https://baseball.yahoo.co.jp/npb/teams/2/memberlist?type=a';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept-Language': 'ja'
};

async function test() {
  const { data } = await axios.get(url, { headers: HEADERS });
  const $ = cheerio.load(data);
  $('tr').each((i, tr) => {
    console.log($(tr).text().replace(/\s+/g, ' '));
  });
}
test();
