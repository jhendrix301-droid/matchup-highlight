import axios from 'axios';
import * as cheerio from 'cheerio';

async function testPitchingStats() {
  // Giants pitching stats
  const { data } = await axios.get('https://baseball.yahoo.co.jp/npb/teams/1/pitchingstats', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'Accept-Language': 'ja' }
  });
  const $ = cheerio.load(data);

  console.log('=== PITCHING STATS TABLE ===');
  const table = $('table').first();
  // Header row
  const headers = [];
  table.find('tr').first().find('th').each((i, th) => {
    headers.push($(th).text().trim());
  });
  console.log('Headers:', headers.join(' | '));
  
  // First 3 data rows
  table.find('tr.bb-playerTable__row, tr').slice(1, 5).each((i, tr) => {
    const cells = [];
    $(tr).find('td').each((j, td) => {
      cells.push($(td).text().trim().replace(/\s+/g, ' '));
    });
    if (cells.length > 3) {
      console.log('Row:', cells.slice(0, 8).join(' | '));
    }
  });
}

async function testBattingStats() {
  // Giants batting stats
  const { data } = await axios.get('https://baseball.yahoo.co.jp/npb/teams/1/battingstats', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'Accept-Language': 'ja' }
  });
  const $ = cheerio.load(data);

  console.log('\n=== BATTING STATS TABLE ===');
  const table = $('table').first();
  const headers = [];
  table.find('tr').first().find('th').each((i, th) => {
    headers.push($(th).text().trim());
  });
  console.log('Headers:', headers.join(' | '));
  
  table.find('tr').slice(1, 5).each((i, tr) => {
    const cells = [];
    $(tr).find('td').each((j, td) => {
      cells.push($(td).text().trim().replace(/\s+/g, ' '));
    });
    if (cells.length > 3) {
      console.log('Row:', cells.slice(0, 10).join(' | '));
    }
  });
}

testPitchingStats().then(() => testBattingStats());
