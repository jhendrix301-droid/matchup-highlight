import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  const url = 'https://baseball.yahoo.co.jp/npb/teams/2/memberlist?type=a';
  const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = cheerio.load(data);
  const rows = $('table tr');
  rows.each((i, row) => {
    console.log($(row).text().replace(/\s+/g, ' ').trim());
  });
}
test();
