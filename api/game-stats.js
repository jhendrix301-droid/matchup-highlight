import axios from 'axios';
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

// 戦評を取得 (/top ページ)
function parseRecap($) {
  const recapEl = $('#async-recap .bb-paragraph');
  return recapEl.length ? recapEl.text().trim() : '';
}

// ヒーロー選手を取得 (/top ページ)
function parseHero($) {
  const heroName = $('a.bb-tableTeamHead__player').text().trim().replace(/\s+/g, '');
  if (!heroName) return null;

  let todayStats = '';
  let reason = '';
  $('th').each((_, th) => {
    const t = $(th).text().trim();
    if (t.includes('本日の成績')) {
      todayStats = $(th).closest('tr').find('td').first().text().trim().replace(/\s+/g, ' ');
    }
    if (t.includes('選考理由')) {
      reason = $(th).closest('tr').find('td').first().text().trim();
    }
  });

  return { name: heroName, stats: todayStats, reason };
}

// 打者成績を取得 (/stats ページ)
function parseBatterStats($) {
  const teams = [];

  $('table.bb-statsTable').each((_, tbl) => {
    const rows = [];
    $(tbl).find('tr.bb-statsTable__row').each((__, tr) => {
      if ($(tr).hasClass('bb-statsTable__row--total')) return;
      const cells = $(tr).find('td').map((___, td) => $(td).text().trim()).get();
      if (cells.length < 14) return;

      const name = (cells[1] || '').replace(/\s+/g, '');
      if (!name) return;

      // 各イニングの打席結果 (index 14以降)
      const inningResults = [];
      for (let i = 14; i < cells.length; i++) {
        if (cells[i]) inningResults.push(cells[i]);
      }

      rows.push({
        pos: cells[0] || '',
        name,
        avg: cells[2] || '',
        atBats: parseInt(cells[3]) || 0,
        runs: parseInt(cells[4]) || 0,
        hits: parseInt(cells[5]) || 0,
        rbi: parseInt(cells[6]) || 0,
        so: parseInt(cells[7]) || 0,
        bb: parseInt(cells[8]) || 0,
        hbp: parseInt(cells[9]) || 0,
        sac: parseInt(cells[10]) || 0,
        sb: parseInt(cells[11]) || 0,
        errors: parseInt(cells[12]) || 0,
        hr: parseInt(cells[13]) || 0,
        inningResults,
      });
    });
    if (rows.length > 0) teams.push(rows);
  });

  // テーブル順: [0]=アウェイ, [1]=ホーム
  return { awayBatters: teams[0] || [], homeBatters: teams[1] || [] };
}

// 投手成績を取得 (/stats ページ)
function parsePitcherStats($) {
  const teams = [];

  $('table.bb-scoreTable').each((_, tbl) => {
    const rows = [];
    $(tbl).find('tr').each((i, tr) => {
      if (i === 0) return; // ヘッダー
      const cells = $(tr).find('td,th').map((__, td) => $(td).text().trim()).get();
      if (cells.length < 14) return;

      const name = (cells[1] || '').replace(/\s+/g, '');
      if (!name) return;

      rows.push({
        result: cells[0] || '',   // 勝/敗/H/S or empty
        name,
        era: cells[2] || '',
        ip: cells[3] || '',       // 投球回
        pitches: parseInt(cells[4]) || 0,
        bf: parseInt(cells[5]) || 0,    // 打者
        hits: parseInt(cells[6]) || 0,  // 被安打
        hr: parseInt(cells[7]) || 0,    // 被本塁打
        so: parseInt(cells[8]) || 0,    // 奪三振
        bb: parseInt(cells[9]) || 0,    // 与四球
        hbp: parseInt(cells[10]) || 0,
        balk: parseInt(cells[11]) || 0,
        runs: parseInt(cells[12]) || 0, // 失点
        er: parseInt(cells[13]) || 0,   // 自責点
      });
    });
    if (rows.length > 0) teams.push(rows);
  });

  // テーブル順: [0]=アウェイ, [1]=ホーム
  return { awayPitchers: teams[0] || [], homePitchers: teams[1] || [] };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'gameId is required' });

  try {
    // /top と /stats を並行取得
    const [topRes, statsRes] = await Promise.all([
      axios.get(`https://baseball.yahoo.co.jp/npb/game/${id}/top`, { headers: HEADERS, timeout: 10000 }),
      axios.get(`https://baseball.yahoo.co.jp/npb/game/${id}/stats`, { headers: HEADERS, timeout: 10000 }),
    ]);

    const $top = cheerio.load(topRes.data);
    const $stats = cheerio.load(statsRes.data);

    const recap = parseRecap($top);
    const hero = parseHero($top);
    const { homeBatters, awayBatters } = parseBatterStats($stats);
    const { homePitchers, awayPitchers } = parsePitcherStats($stats);

    res.status(200).json({
      gameId: id,
      recap,
      hero,
      homeBatters,
      awayBatters,
      homePitchers,
      awayPitchers,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
