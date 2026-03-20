import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  const url = 'https://npb.jp/bis/teams/rst_h.html';
  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept-Language': 'ja'
    }
  });
  
  // Split HTML by anchor markers
  const pitStart = data.indexOf('<a name="pit">');
  const catStart = data.indexOf('<a name="cat">');
  const infStart = data.indexOf('<a name="inf">');
  const outStart = data.indexOf('<a name="out">');
  
  console.log('Positions:', { pitStart, catStart, infStart, outStart });
  
  // Extract pitcher section HTML
  if (pitStart > -1 && catStart > -1) {
    const pitSection = data.substring(pitStart, catStart);
    const $ = cheerio.load(pitSection);
    const players = [];
    $('tr').each((i, tr) => {
      const tds = $(tr).find('td');
      if (tds.length >= 2) {
        const num = $(tds[0]).text().trim();
        const link = $(tds[1]).find('a');
        let name = link.length ? link.text().trim() : $(tds[1]).text().trim();
        name = name.replace(/[\u3000]+/g, ' ').trim();
        if (num && name && !isNaN(parseInt(num))) {
          players.push({ number: num, name });
        }
      }
    });
    console.log(`\nPitchers found: ${players.length}`);
    console.log('First 5:', players.slice(0, 5));
  }

  // Extract catcher section
  if (catStart > -1 && infStart > -1) {
    const catSection = data.substring(catStart, infStart);
    const $ = cheerio.load(catSection);
    const players = [];
    $('tr').each((i, tr) => {
      const tds = $(tr).find('td');
      if (tds.length >= 2) {
        const num = $(tds[0]).text().trim();
        const link = $(tds[1]).find('a');
        let name = link.length ? link.text().trim() : $(tds[1]).text().trim();
        name = name.replace(/[\u3000]+/g, ' ').trim();
        if (num && name && !isNaN(parseInt(num))) {
          players.push({ number: num, name });
        }
      }
    });
    console.log(`\nCatchers found: ${players.length}`);
    console.log('All:', players);
  }
}
test();
