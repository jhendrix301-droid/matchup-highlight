import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  // Check the default memberlist page (no type param) for Softbank
  const { data } = await axios.get('https://baseball.yahoo.co.jp/npb/teams/12/memberlist', { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = cheerio.load(data);
  
  // Show all headings
  $('h1, h2, h3').each((i, el) => {
    console.log("Heading:", $(el).text().trim().substring(0, 80));
  });
  
  console.log("\n=== Tables ===");
  $('table').each((i, table) => {
    const headerRow = $(table).find('tr').first();
    const headerCells = headerRow.find('th, td').map((_, td) => $(td).text().trim()).get();
    console.log("Table " + i + " headers = [" + headerCells.slice(0, 6).join(', ') + "]");
    
    $(table).find('tr').slice(1, 4).each((j, tr) => {
      const cells = $(tr).find('td').map((_, td) => $(td).text().trim().replace(/\s+/g, ' ')).get();
      console.log("  Row: [" + cells.slice(0, 5).join(' | ') + "]");
    });
  });

  // Also check links structure
  console.log("\n=== Navigation tabs ===");
  $('a').each((i, a) => {
    const href = $(a).attr('href') || '';
    const text = $(a).text().trim();
    if (href.includes('memberlist') && text.length < 30) {
      console.log("Link: " + text + " -> " + href);
    }
  });
}
test();
