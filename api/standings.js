import axios from 'axios';
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

// 順位表ページをパースしてチーム別成績マップを返す
// headers: 順位|チーム名|試合|勝利|敗戦|引分|勝率|勝差|残試合|得点|失点|本塁打|盗塁|打率|防御率|失策
function parseStandingsTable($, tbl) {
  const result = {};
  $(tbl).find('tr').slice(1).each((_, tr) => {
    const cells = $(tr).find('th,td').map((_, td) => $(td).text().trim()).get();
    if (!cells[1]) return;
    result[cells[1]] = {
      rank:   parseInt(cells[0])  || 0,
      games:  parseInt(cells[2])  || 0,
      wins:   parseInt(cells[3])  || 0,
      losses: parseInt(cells[4])  || 0,
      draws:  parseInt(cells[5])  || 0,
      pct:    cells[6]  || '',
      gb:     cells[7]  || '-',
      runs:   parseInt(cells[9])  || 0,
      era:    cells[14] || '',
      avg:    cells[13] || '',
    };
  });
  return result;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'max-age=300'); // 5分キャッシュ

  try {
    const url = 'https://baseball.yahoo.co.jp/npb/standings/';
    const { data } = await axios.get(url, { headers: HEADERS, timeout: 10000 });
    const $ = cheerio.load(data);

    const tables = $('table');
    // table[0] = セリーグ, table[1] = パリーグ
    const central = parseStandingsTable($, tables.eq(0));
    const pacific = parseStandingsTable($, tables.eq(1));

    const standings = { ...central, ...pacific };
    res.status(200).json({ standings, central, pacific });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
