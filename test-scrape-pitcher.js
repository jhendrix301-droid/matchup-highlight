import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  const { data } = await axios.get('https://baseball.yahoo.co.jp/npb/teams/5/memberlist?type=a', { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = cheerio.load(data);
  
  // They separate pitchers and batters on Yahoo
  const tables = $('.bb-playerTable');
  console.log(`Found ${tables.length} tables`);
  
  tables.each((i, table) => {
    console.log(`--- Table ${i} ---`);
    $(table).find('tr').slice(1, 5).each((j, tr) => {
       const tds = $(tr).find('td');
       if (tds.length > 2) {
          const num = $(tds[0]).text().trim();
          const nameContainer = $(tds[1]).find('a');
          const name = nameContainer.length ? nameContainer.text().trim().replace(/\s+/g, ' ') : $(tds[1]).text().trim().replace(/\s+/g, ' ');
          console.log(`Player: #${num} ${name}`);
       }
    });
  });
}
test();
