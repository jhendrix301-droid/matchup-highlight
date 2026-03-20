import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  const { data } = await axios.get('https://baseball.yahoo.co.jp/npb/teams/5/memberlist?type=a', { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = cheerio.load(data);
  
  console.log("Sections with bb-playerTable:");
  $('.bb-playerTable').each((i, table) => {
    const sectionName = $(table).prev('h1, h2, h3, header').text().trim() || $(table).find('caption').text().trim();
    console.log(`Found table. Header/Caption might be: ${sectionName}`);
    
    let firstTr = $(table).find('tr:nth-child(2)');
    let firstTdText = firstTr.text().replace(/\s+/g, ' ').trim();
    console.log(`First row content sample: ${firstTdText}`);
  });
}
test();
