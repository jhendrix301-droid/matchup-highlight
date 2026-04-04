import axios from 'axios';
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

function parseName(fullName) {
  const cleaned = (fullName || '').replace(/\s+/g, '');
  const last = (fullName || '').trim().split(/[\s　]/)[0];
  return { full: cleaned, last };
}

// bb-splitsHead 以降の bb-splitsTable を走査し
// スタメン投手・打順を取得
function parseTeamSection($, $head) {
  let startingPitcher = null;
  const lineup = [];

  let $el = $head.next();
  while ($el.length && !$el.hasClass('bb-splitsHead')) {
    if ($el.hasClass('bb-splitsTable')) {
      const headerRow = $el.find('tr').first();
      const headers = headerRow.find('th,td').map((_, td) => $(td).text().trim()).get();
      const firstHeader = headers[0] || '';

      if (firstHeader === '投手') {
        $el.find('tr').each((i, tr) => {
          if (i === 0) return;
          const cells = $(tr).find('td').map((_, td) => $(td).text().trim()).get();
          if (cells[0] === '先発' && cells[2]) {
            startingPitcher = parseName(cells[2]);
            return false;
          }
        });

      } else if (firstHeader === '打順') {
        $el.find('tr').each((i, tr) => {
          if (i === 0) return;
          const cells = $(tr).find('td').map((_, td) => $(td).text().trim()).get();
          const order = parseInt(cells[0]);
          if (order >= 1 && order <= 9 && cells[2]) {
            const p = parseName(cells[2]);
            lineup.push({
              order,
              pos: cells[1] || '',
              name: p.full,
              lastName: p.last,
              bat: cells[3] || '',
              avg: cells[4] || '',
            });
          }
        });
      }
    }
    $el = $el.next();
  }

  return { startingPitcher, lineup };
}

// bb-modCommon03 セクションからベンチ打者を取得
// 各セクション内: item[0]=ホーム, item[1]=アウェイ
function parseBenchSections($) {
  const homeBench = [];
  const awayBench = [];

  $('.bb-modCommon03').each((_, mod) => {
    const items = $(mod).find('.bb-splits__item');
    if (items.length < 2) return;

    const firstTable = $(items[0]).find('.bb-splitsTable').first();
    if (!firstTable.length) return;

    const headers = firstTable.find('tr').first().find('th,td').map((_, td) => $(td).text().trim()).get();
    // 打率列あり・防御率列なし → ベンチ打者テーブル
    if (headers[0] !== '選手名' || headers[2] !== '打率') return;

    [[homeBench, 0], [awayBench, 1]].forEach(([arr, itemIdx]) => {
      $(items[itemIdx]).find('.bb-splitsTable tr').each((rowIdx, row) => {
        if (rowIdx === 0) return;
        const cells = $(row).find('td').map((_, td) => $(td).text().trim()).get();
        if (!cells[0]) return;
        const p = parseName(cells[0]);
        const throwBat = cells[1] || '';
        arr.push({
          name: p.full,
          lastName: p.last,
          bat: throwBat.length >= 2 ? throwBat[1] : '',
          avg: cells[2] || '',
        });
      });
    });
  });

  return { homeBench, awayBench };
}

// bb-splitsTable の投手テーブルから先発投手の成績を取得
// テーブル構造: 投手 | 位置 | 選手名 | 投 | 防御率 | 調子
function parsePitcherStatsFromTop($) {
  const results = [];

  $('.bb-splitsTable').each((_, tbl) => {
    const headers = $(tbl).find('tr').first().find('th,td')
      .map((__, td) => $(td).text().trim()).get();
    // 先発投手テーブルは headers[0]==='投手' かつ headers.includes('防御率')
    if (headers[0] !== '投手' || !headers.includes('防御率')) return;

    $(tbl).find('tr').each((i, tr) => {
      if (i === 0) return; // ヘッダー行スキップ
      const cells = $(tr).find('td').map((__, td) => $(td).text().trim()).get();
      // cells: [位置(先発), ポジション(投), 選手名, 投(左/右), 防御率, 調子]
      if (cells[0] === '先発' && cells[2]) {
        const name = (cells[2] || '').replace(/\s+/g, '');
        const throwing = cells[3] || '';
        const era = cells[4] && cells[4] !== '-' ? cells[4] : null;
        const condition = cells[5] || '';
        results.push({ name, throwing, era, condition, starts: 0, wins: 0, losses: 0 });
      }
    });
  });

  // results[0] = ホーム投手, results[1] = アウェイ投手
  return {
    homePitcherStats: results[0] || null,
    awayPitcherStats: results[1] || null,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache');

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'gameId is required' });

  try {
    // /top にスコア・状況・スタメン・投手成績が全て揃っている
    const topRes = await axios.get(
      `https://baseball.yahoo.co.jp/npb/game/${id}/top`,
      { headers: HEADERS, timeout: 10000 }
    );
    const { data } = topRes;
    const $ = cheerio.load(data);

    // ========== チーム名 ==========
    const teamNames = $('.bb-gameTeam__name').map((_, el) => $(el).text().trim()).get();
    const homeTeam = teamNames[0] || '';
    const awayTeam = teamNames[1] || '';

    // ========== スコア ==========
    const homeScoreText = $('.bb-gameTeam__homeScore').first().text().trim();
    const awayScoreText = $('.bb-gameTeam__awayScore').first().text().trim();
    const homeScore = homeScoreText !== '' && !isNaN(homeScoreText) ? parseInt(homeScoreText) : null;
    const awayScore = awayScoreText !== '' && !isNaN(awayScoreText) ? parseInt(awayScoreText) : null;

    // ========== 試合状況 ==========
    const stateText = $('.bb-gameCard__state').first().text().trim();
    let status = 'pre';
    if (stateText.includes('試合終了')) status = 'final';
    else if (stateText.match(/\d+回/)) status = 'live';

    const inningMatch = stateText.match(/(\d+)回(表|裏)?/);
    const inning = inningMatch ? stateText : null;

    // ========== 試合開始時間 ==========
    let startTime = '';
    // 専用time/startTime要素を探す
    $('[class*="gameTime"], [class*="startTime"], [class*="GameTime"], .bb-gameCard__time, time').each((_, el) => {
      if (startTime) return false;
      const txt = $(el).text().trim();
      const m = txt.match(/(\d{1,2}:\d{2})/);
      if (m) startTime = m[1];
    });
    // stateText 内フォールバック
    if (!startTime) {
      const m = stateText.match(/(\d{1,2}:\d{2})/);
      if (m) startTime = m[1];
    }
    // 試合情報テキスト全体からもスキャン
    if (!startTime) {
      $('dd, .bb-gameCard__info').each((_, el) => {
        if (startTime) return false;
        const txt = $(el).text().trim();
        const m = txt.match(/(\d{1,2}:\d{2})/);
        if (m) startTime = m[1];
      });
    }

    // ========== ライブ試合: 現在の投手・打者 ==========
    // bb-gameTable__batter: 得点が入った打席の記録（直近が末尾）
    // ライブ中は最新エントリが現在または直近の打席に近い
    let liveBatter = null;
    let livePitcherHome = null;
    let livePitcherAway = null;

    if (status === 'live') {
      // 現在投手: bb-scoreList の投手名（(勝)(敗)(S) 等のプレフィックスなしで表示）
      const homePlayers = $('.bb-scoreList__homePlayer').first().text().trim()
        .replace(/\(勝\)|\(敗\)|\(S\)/g, '').trim();
      const awayPlayers = $('.bb-scoreList__awayPlayer').first().text().trim()
        .replace(/\(勝\)|\(敗\)|\(S\)/g, '').trim();
      if (homePlayers) livePitcherHome = parseName(homePlayers.split(/\s+/)[0]).full;
      if (awayPlayers) livePitcherAway = parseName(awayPlayers.split(/\s+/)[0]).full;

      // 現在打者: bb-gameTable__batter の最後のエントリ（直近打席）
      const batterRows = $('.bb-gameTable__batter');
      if (batterRows.length > 0) {
        const lastRow = $(batterRows[batterRows.length - 1]);
        const playerText = lastRow.find('.bb-gameTable__player').text().trim();
        if (playerText) liveBatter = parseName(playerText).full;
      }
    }

    // ========== スタメン + ベンチ ==========
    // bb-splitsHead は各チーム複数ある（投手・打者等）ためチーム名で照合
    let homeSplits = { startingPitcher: null, lineup: [] };
    let awaySplits = { startingPitcher: null, lineup: [] };
    let homeFound = false, awayFound = false;

    $('.bb-splitsHead').each((_, head) => {
      const headTeam = $(head).find('h1').text().trim();
      if (!homeFound && headTeam === homeTeam) {
        homeSplits = parseTeamSection($, $(head));
        homeFound = true;
      } else if (!awayFound && headTeam === awayTeam) {
        awaySplits = parseTeamSection($, $(head));
        awayFound = true;
      }
    });

    const { homeBench, awayBench } = parseBenchSections($);

    const homeStartingPitcher = homeSplits.startingPitcher?.full || '';
    const awayStartingPitcher = awaySplits.startingPitcher?.full || '';

    // 現在投手: ライブ時は実況データ優先、なければ先発投手
    const currentPitcher = livePitcherHome || homeStartingPitcher;
    const currentAwayPitcher = livePitcherAway || awayStartingPitcher;

    // 現在打者: ライブ時は直近打席データ優先、なければ1番打者
    const currentBatter = liveBatter || awaySplits.lineup[0]?.name || '';

    // 同じ /top ページから投手の今季成績・直近登板を取得
    const { homePitcherStats, awayPitcherStats } = parsePitcherStatsFromTop($);

    res.status(200).json({
      gameId: id,
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      inning,
      status,
      homeStartingPitcher,
      awayStartingPitcher,
      currentPitcher,
      currentAwayPitcher,
      currentBatter,
      lineupHome: homeSplits.lineup,
      lineupAway: awaySplits.lineup,
      benchHome: homeBench,
      benchAway: awayBench,
      homePitcherStats,
      awayPitcherStats,
      startTime,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
