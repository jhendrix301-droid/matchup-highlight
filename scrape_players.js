import fs from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { exec } from 'child_process';
import util from 'util';
const execPromise = util.promisify(exec);

// ===== Team Configuration =====
const teamConfigs = {
  'T': { npbCode: 't', yahooId: '5', league: 'C', apiTeamId: 4 },   // 阪神
  'C': { npbCode: 'c', yahooId: '6', league: 'C', apiTeamId: 5 },   // 広島
  'DB': { npbCode: 'db', yahooId: '3', league: 'C', apiTeamId: 3 },   // DeNA
  'G': { npbCode: 'g', yahooId: '1', league: 'C', apiTeamId: 2 },   // 巨人
  'S': { npbCode: 's', yahooId: '2', league: 'C', apiTeamId: 1 },   // ヤクルト
  'D': { npbCode: 'd', yahooId: '4', league: 'C', apiTeamId: 6 },   // 中日
  'B': { npbCode: 'b', yahooId: '11', league: 'P', apiTeamId: 10 },  // オリックス
  'M': { npbCode: 'm', yahooId: '9', league: 'P', apiTeamId: 11 },  // ロッテ
  'H': { npbCode: 'h', yahooId: '12', league: 'P', apiTeamId: 7 },   // ソフトバンク
  'E': { npbCode: 'e', yahooId: '376', league: 'P', apiTeamId: 12 },  // 楽天
  'L': { npbCode: 'l', yahooId: '7', league: 'P', apiTeamId: 9 },   // 西武
  'F': { npbCode: 'f', yahooId: '8', league: 'P', apiTeamId: 8 },   // 日ハム
};

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept-Language': 'ja'
};

const wait = (ms) => new Promise(r => setTimeout(r, ms));

// ===== NPB.jp: Roster with position classification =====
function extractPlayersFromSection(html) {
  const $ = cheerio.load('<table>' + html + '</table>');
  const players = [];
  $('tr.rosterPlayer').each((i, tr) => {
    const tds = $(tr).find('td');
    if (tds.length >= 2) {
      const num = $(tds[0]).text().trim();
      const link = $(tds[1]).find('a');
      let name = link.length ? link.text().trim() : $(tds[1]).text().trim();
      name = name.replace(/[\u3000]+/g, ' ').trim();
      const href = link.length ? link.attr('href') : null;
      if (num && name && !isNaN(parseInt(num))) {
        players.push({ number: num, name, href });
      }
    }
  });
  players.sort((a, b) => parseInt(a.number) - parseInt(b.number));
  return players;
}

async function scrapeNPBRoster(npbCode) {
  const url = `https://npb.jp/bis/teams/rst_${npbCode}.html`;
  const { data } = await axios.get(url, { headers: HEADERS });

  const pitStart = data.indexOf('name="pit"');
  const catStart = data.indexOf('name="cat"');
  const infStart = data.indexOf('name="inf"');
  const outStart = data.indexOf('name="out"');

  let pitchers = [], catchers = [], infielders = [], outfielders = [];

  if (pitStart > -1 && catStart > -1) pitchers = extractPlayersFromSection(data.substring(pitStart, catStart));
  if (catStart > -1 && infStart > -1) catchers = extractPlayersFromSection(data.substring(catStart, infStart));
  if (infStart > -1 && outStart > -1) infielders = extractPlayersFromSection(data.substring(infStart, outStart));
  if (outStart > -1) {
    const endMarker = data.indexOf('育成選手', outStart);
    outfielders = extractPlayersFromSection(data.substring(outStart, endMarker > -1 ? endMarker : data.length));
  }

  const fieldPlayers = [...catchers, ...infielders, ...outfielders];
  fieldPlayers.sort((a, b) => parseInt(a.number) - parseInt(b.number));

  // --- Fetch handedness for all players ---
  console.log(`    Fetching handedness for ${pitchers.length + fieldPlayers.length} players...`);
  const allRoster = [...pitchers, ...fieldPlayers];
  
  // We'll batch these 5 at a time
  const batchSize = 5;
  for (let i = 0; i < allRoster.length; i += batchSize) {
    const batch = allRoster.slice(i, i + batchSize);
    await Promise.all(batch.map(async (p) => {
      if (!p.href) return;
      try {
        const pUrl = `https://npb.jp${p.href}`;
        const cmd = `curl -s "${pUrl}" | tr -d '\\n' | grep -oE "(右|左|両)投|(右|左|両)打"`;
        const { stdout } = await execPromise(cmd);
        
        if (stdout) {
          const lines = stdout.trim().split('\n');
          lines.forEach(line => {
            if (line.includes('投')) {
              p.throw = line.includes('右') ? 1 : (line.includes('左') ? 2 : 3);
            }
            if (line.includes('打')) {
              p.bat = line.includes('右') ? 1 : (line.includes('左') ? 2 : 3);
            }
          });
        }
      } catch (e) {
        // grep failure (exit code 1) means no match, ignore
      }
    }));
    await wait(200); // polite delay between batches
  }
  
  // Cleanup hrefs
  allRoster.forEach(p => delete p.href);

  return { pitchers, fieldPlayers };
}

// ===== Yahoo Sports: Real statistics =====
async function scrapePitchingStats(yahooId) {
  const url = `https://baseball.yahoo.co.jp/npb/teams/${yahooId}/pitchingstats`;
  const { data } = await axios.get(url, { headers: HEADERS });
  const $ = cheerio.load(data);
  const stats = {};

  $('table').first().find('tr').slice(1).each((i, tr) => {
    const tds = $(tr).find('td');
    if (tds.length < 20) return;

    const number = $(tds[0]).text().trim();
    const era = $(tds[2]).text().trim();
    const games = $(tds[3]).text().trim();
    const wins = $(tds[8]).text().trim();
    const losses = $(tds[9]).text().trim();
    const saves = $(tds[12]).text().trim();
    const ip = $(tds[14]).text().trim();
    const so = $(tds[17]).text().trim();
    const kRate = $(tds[18]).text().trim();
    const whip = tds.length > 27 ? $(tds[27]).text().trim() : '-';

    if (number && !isNaN(parseInt(number))) {
      stats[number] = { era, games, wins, losses, saves, ip, so, kRate, whip };
    }
  });
  return stats;
}

async function scrapeBattingStats(yahooId) {
  const url = `https://baseball.yahoo.co.jp/npb/teams/${yahooId}/battingstats`;
  const { data } = await axios.get(url, { headers: HEADERS });
  const $ = cheerio.load(data);
  const stats = {};

  $('table').first().find('tr').slice(1).each((i, tr) => {
    const tds = $(tr).find('td');
    if (tds.length < 20) return;

    // Batting table: Position(0), Number(1), Name(2), AVG(3), Games(4), PA(5), AB(6), Hits(7), 2B(8), 3B(9), HR(10), TB(11), RBI(12), R(13), SO(14), BB(15), HBP(16), SH(17), SF(18), SB(19), CS(20), DP(21), OBP(22), SLG(23), OPS(24), RISP(25), E(26)
    const number = $(tds[1]).text().trim();
    const avg = $(tds[3]).text().trim();
    const games = $(tds[4]).text().trim();
    const hits = $(tds[7]).text().trim();
    const hr = $(tds[10]).text().trim();
    const rbi = $(tds[12]).text().trim();
    const bb = $(tds[15]).text().trim();
    const obp = $(tds[22]).text().trim();
    const slg = $(tds[23]).text().trim();
    const ops = $(tds[24]).text().trim();
    const risp = $(tds[25]).text().trim();

    if (number && !isNaN(parseInt(number))) {
      stats[number] = { avg, games, hits, hr, rbi, bb, obp, slg, ops, risp };
    }
  });
  return stats;
}

// ===== baseball-pitcher-vs-batter.com API: Player ID mapping =====
const API_BASE = 'https://baseball-pitcher-vs-batter.com/baseball/api';

async function fetchApiPlayerIds(apiTeamId) {
  const pitcherRes = await axios.get(`${API_BASE}/getPitcherList`, {
    params: { teamId: apiTeamId, year: '2025' }
  });
  const batterRes = await axios.get(`${API_BASE}/getBatterList`, {
    params: { teamId: apiTeamId, year: '2025' }
  });

  const apiPitchers = pitcherRes.data?.data?.pitcherList || [];
  const apiBatters = batterRes.data?.data?.batterList || [];
  return { apiPitchers, apiBatters };
}

function normalizeName(name) {
  // Normalize full-width spaces, trim, remove special chars for matching
  return name.replace(/[\u3000\s]+/g, '').replace(/[・．.]/g, '').replace(/\uFF2F\uFF30\uFF33/g, '');
}

function matchPlayerId(rosterName, apiPlayers) {
  const normalRoster = normalizeName(rosterName);
  for (const ap of apiPlayers) {
    const normalApi = normalizeName(ap.playerNm);
    if (normalRoster === normalApi) return ap.playerId;
    // Partial match: last name match for foreign players
    if (normalRoster.length >= 2 && normalApi.includes(normalRoster)) return ap.playerId;
    if (normalApi.length >= 2 && normalRoster.includes(normalApi)) return ap.playerId;
  }
  return null;
}

// ===== Main =====
async function main() {
  const pitcherRoster = {};
  const batterRoster = {};

  for (const [teamId, config] of Object.entries(teamConfigs)) {
    console.log(`Scraping ${teamId} (${config.league}-League)...`);

    try {
      // 1) NPB.jp: Position-classified roster
      const { pitchers, fieldPlayers } = await scrapeNPBRoster(config.npbCode);
      await wait(800);

      // 2) Yahoo Sports: Pitching stats
      const pitchingStats = await scrapePitchingStats(config.yahooId);
      await wait(800);

      // 3) Yahoo Sports: Batting stats
      const battingStats = await scrapeBattingStats(config.yahooId);
      await wait(800);

      // 4) API: Player IDs for head-to-head lookup
      let apiPitchers = [], apiBatters = [];
      try {
        const apiData = await fetchApiPlayerIds(config.apiTeamId);
        apiPitchers = apiData.apiPitchers;
        apiBatters = apiData.apiBatters;
        await wait(500);
      } catch (e) {
        console.warn(`  API ID fetch failed: ${e.message}`);
      }

      // 5) Merge roster + stats + API IDs
      const enrichedPitchers = pitchers.map(p => {
        const apiId = matchPlayerId(p.name, apiPitchers);
        return {
          ...p,
          ...(pitchingStats[p.number] || { era: '-', games: '0', wins: '0', losses: '0', saves: '0', ip: '0', so: '0', kRate: '-', whip: '-' }),
          ...(apiId ? { apiId } : {})
        };
      });
      pitcherRoster[teamId] = enrichedPitchers;

      // For batters
      let batterList;
      if (config.league === 'C') {
        const allPlayers = [...fieldPlayers, ...pitchers];
        const unique = Array.from(new Map(allPlayers.map(p => [p.number, p])).values());
        unique.sort((a, b) => parseInt(a.number) - parseInt(b.number));
        batterList = unique;
      } else {
        batterList = fieldPlayers;
      }

      const enrichedBatters = batterList.map(p => {
        const apiId = matchPlayerId(p.name, apiBatters);
        return {
          ...p,
          ...(battingStats[p.number] || { avg: '-', games: '0', hits: '0', hr: '0', rbi: '0', bb: '0', obp: '-', slg: '-', ops: '-', risp: '-' }),
          ...(apiId ? { apiId } : {})
        };
      });
      batterRoster[teamId] = enrichedBatters;

      const pMatched = enrichedPitchers.filter(p => p.apiId).length;
      const bMatched = enrichedBatters.filter(p => p.apiId).length;
      console.log(`  Pitchers: ${enrichedPitchers.length} (stats:${Object.keys(pitchingStats).length}, apiId:${pMatched})`);
      console.log(`  Batters:  ${enrichedBatters.length} (stats:${Object.keys(battingStats).length}, apiId:${bMatched})`);
    } catch (err) {
      console.error(`  Error for ${teamId}: ${err.message}`);
      pitcherRoster[teamId] = [];
      batterRoster[teamId] = [];
    }
  }

  // Generate mockData.js
  const content = `// Auto-generated from NPB.jp, Yahoo Sports & PvB API - ${new Date().toISOString().slice(0, 10)}
export const teams = [
  { id: 'T', name: '阪神タイガース', apiTeamId: 4 },
  { id: 'C', name: '広島東洋カープ', apiTeamId: 5 },
  { id: 'DB', name: '横浜DeNAベイスターズ', apiTeamId: 3 },
  { id: 'G', name: '読売ジャイアンツ', apiTeamId: 2 },
  { id: 'S', name: '東京ヤクルトスワローズ', apiTeamId: 1 },
  { id: 'D', name: '中日ドラゴンズ', apiTeamId: 6 },
  { id: 'B', name: 'オリックス・バファローズ', apiTeamId: 10 },
  { id: 'M', name: '千葉ロッテマリーンズ', apiTeamId: 11 },
  { id: 'H', name: '福岡ソフトバンクホークス', apiTeamId: 7 },
  { id: 'E', name: '東北楽天ゴールデンイーグルス', apiTeamId: 12 },
  { id: 'L', name: '埼玉西武ライオンズ', apiTeamId: 9 },
  { id: 'F', name: '北海道日本ハムファイターズ', apiTeamId: 8 }
];

export const pitcherRoster = ${JSON.stringify(pitcherRoster, null, 2)};

export const batterRoster = ${JSON.stringify(batterRoster, null, 2)};
`;

  fs.writeFileSync('src/mockData.js', content);
  console.log('\nDone! src/mockData.js generated with stats + API IDs.');
}

main();
