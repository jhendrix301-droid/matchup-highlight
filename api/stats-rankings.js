import axios from 'axios';
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};
const BASE = 'https://baseball.yahoo.co.jp';

function parsePage($, statKey, numeric = true) {
  const rows = [];
  $('tr.bb-playerTable__row').each((_, tr) => {
    const $tr = $(tr);
    const playerCell = $tr.find('.bb-playerTable__data--player');
    if (!playerCell.length) return;

    const link = playerCell.find('.bb-playerTable__member a').first();
    const name = link.text().trim();
    const team = playerCell.find('.bb-playerTable__member span a').first().text().trim();
    if (!name) return;

    const profilePath = link.attr('href') || '';
    const selectedCell = $tr.find('.bb-playerTable__data--selected');
    const rawVal = selectedCell.text().trim();
    const val = numeric ? parseFloat(rawVal) : rawVal;

    rows.push({ name, team, profilePath, [statKey]: isNaN(val) ? 0 : val });
  });
  return rows;
}

async function fetchCategory(path, statKey, ascending = false) {
  try {
    const { data } = await axios.get(`${BASE}${path}`, { headers: HEADERS, timeout: 10000 });
    const $ = cheerio.load(data);
    const rows = parsePage($, statKey);
    if (ascending) {
      return rows.filter(r => r[statKey] > 0 && r[statKey] < 99).slice(0, 5);
    }
    return rows.filter(r => r[statKey] > 0).slice(0, 5);
  } catch (e) {
    console.warn(`fetch ${path} failed:`, e.message);
    return [];
  }
}

async function top5ByLeague(batterOrPitcher, type, statKey, ascending = false) {
  const [c, p] = await Promise.all([
    fetchCategory(`/npb/stats/${batterOrPitcher}?gameKindId=1&type=${type}`, statKey, ascending),
    fetchCategory(`/npb/stats/${batterOrPitcher}?gameKindId=2&type=${type}`, statKey, ascending),
  ]);
  return { central: c.slice(0, 5), pacific: p.slice(0, 5) };
}

// 選手プロフィールから背番号とフルネームを取得
async function fetchPlayerProfile(profilePath) {
  try {
    const { data } = await axios.get(`${BASE}${profilePath}`, { headers: HEADERS, timeout: 8000 });
    const $ = cheerio.load(data);
    const jersey = $('.bb-profile__number').first().text().trim();
    // フルネーム: ruby要素内のrt（読み仮名）を除いたテキスト
    const $nameEl = $('.bb-profile__name .bb-profile__ruby').first();
    $nameEl.find('rt').remove();
    const fullName = $nameEl.text().trim();
    return { jersey: jersey || '', fullName: fullName || '' };
  } catch {
    return { jersey: '', fullName: '' };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'max-age=300');

  try {
    const [
      avg, hr, rbi, hits, sb,
      era, wins, sv, hold, so,
    ] = await Promise.all([
      top5ByLeague('batter',  'avg', 'avg'),
      top5ByLeague('batter',  'hr',  'hr'),
      top5ByLeague('batter',  'rbi', 'rbi'),
      top5ByLeague('batter',  'h',   'hits'),
      top5ByLeague('batter',  'sb',  'sb'),
      top5ByLeague('pitcher', 'era', 'era', true),
      top5ByLeague('pitcher', 'w',   'wins'),
      top5ByLeague('pitcher', 'sv',  'sv'),
      top5ByLeague('pitcher', 'hld', 'hold'),
      top5ByLeague('pitcher', 'so',  'so'),
    ]);

    // ユニーク選手プロフィールを一括取得（背番号＋フルネーム）
    const allLeagueData = [avg, hr, rbi, hits, sb, era, wins, sv, hold, so];
    const allPlayers = allLeagueData.flatMap(d => [...d.central, ...d.pacific]);
    const uniquePaths = [...new Set(allPlayers.map(p => p.profilePath).filter(Boolean))];
    const profileResults = await Promise.all(uniquePaths.map(path => fetchPlayerProfile(path)));
    const profileMap = Object.fromEntries(uniquePaths.map((path, i) => [path, profileResults[i]]));

    const addProfile = players => players.map(p => ({
      ...p,
      jersey: profileMap[p.profilePath]?.jersey || '',
      name: profileMap[p.profilePath]?.fullName || p.name,
      profilePath: undefined,
    }));

    const splitLeague = (data) => ({
      central: addProfile(data.central),
      pacific: addProfile(data.pacific),
    });

    res.status(200).json({
      rankings: {
        batting: {
          avg: splitLeague(avg), hr: splitLeague(hr), rbi: splitLeague(rbi),
          hits: splitLeague(hits), sb: splitLeague(sb),
        },
        pitching: {
          era: splitLeague(era), wins: splitLeague(wins), sv: splitLeague(sv),
          hold: splitLeague(hold), so: splitLeague(so),
        },
      },
    });
  } catch (e) {
    console.error('stats-rankings error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
