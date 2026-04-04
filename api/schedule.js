import axios from 'axios';
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

function getTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache');

  const dateStr = req.query?.date || getTodayStr();

  try {
    const url = `https://baseball.yahoo.co.jp/npb/schedule/?date=${dateStr}`;
    const { data } = await axios.get(url, { headers: HEADERS, timeout: 10000 });
    const $ = cheerio.load(data);

    const games = [];

    const [year, month, day] = dateStr.split('-').map(Number);
    const datePattern = new RegExp(`${month}月${day}日`);

    // 全 row を走査して対象日を特定
    // 構造: 日付ヘッダー行 → 同日の試合行(thなし) → 次の日付ヘッダー行...
    const allRows = $('.bb-scheduleTable__row').toArray();
    const $targetRows = [];
    let collecting = false;

    for (const tr of allRows) {
      const $tr = $(tr);
      const thText = $tr.find('th.bb-scheduleTable__head').text().trim();

      if (thText) {
        // 日付ヘッダー行: マッチしたら収集開始、しなければ停止
        collecting = datePattern.test(thText);
      }
      // thがない行は前の日付グループに属する

      if (collecting) {
        $targetRows.push($tr);
      }
    }

    // 各対象行から試合を取得
    $targetRows.forEach($tr => {
      $tr.find('.bb-scheduleTable__grid').each((_, grid) => {
        const $grid = $(grid);

        // ゲームID: 最も近い a[href*=/npb/game/] から取得
        let gameId = '';
        let gameUrl = '';
        const $link = $grid.closest('a[href*="/npb/game/"]').add($grid.find('a[href*="/npb/game/"]').first());
        $link.each((_, a) => {
          const href = $(a).attr('href') || '';
          const m = href.match(/\/npb\/game\/(\d+)\/index/);
          if (m && !gameId) { gameId = m[1]; gameUrl = `https://baseball.yahoo.co.jp${href}`; }
        });

        // チーム名 (homeName / awayName)
        const homeName = $grid.find('[class*="bb-scheduleTable__homeName"]').first().text().trim();
        const awayName = $grid.find('[class*="bb-scheduleTable__awayName"]').first().text().trim();

        // 試合状況 (status): 「試合終了」「見どころ」「○回X裏/表」等
        const statusText = $grid.find('.bb-scheduleTable__status').first().text().trim();
        let status = 'pre';
        if (statusText.includes('試合終了')) status = 'final';
        else if (statusText.match(/\d+回/)) status = 'live';
        else if (statusText === '見どころ') status = 'pre';

        // スコア
        let homeScore = null, awayScore = null;
        const scoreText = $grid.find('.bb-scheduleTable__score').first().text().trim();
        const scoreMatch = scoreText.match(/(\d+)\s*[-－]\s*(\d+)/);
        if (scoreMatch) {
          homeScore = parseInt(scoreMatch[1]);
          awayScore = parseInt(scoreMatch[2]);
        }

        // 開始時間（statusText, 専用time要素, data-* 属性を順に探す）
        let startTime = '';
        const timeFromStatus = statusText.match(/(\d{1,2}:\d{2})/);
        if (timeFromStatus) {
          startTime = timeFromStatus[1];
        } else {
          const timeEl = $grid.find('[class*="time"], [class*="Time"], time').filter((_, el) => {
            const t = $(el).text().trim();
            return /^\d{1,2}:\d{2}$/.test(t);
          }).first().text().trim();
          if (timeEl) {
            startTime = timeEl;
          } else {
            // data-starttime 属性フォールバック
            const dataTime = $grid.closest('[data-starttime]').attr('data-starttime') || '';
            const dtMatch = dataTime.match(/(\d{1,2}:\d{2})/);
            if (dtMatch) startTime = dtMatch[1];
          }
        }

        // 予告先発 / 勝敗投手
        const homePlayers = $grid.find('[class*="homePlayer"] .bb-scheduleTable__player').map((_, el) => $(el).text().trim()).get();
        const awayPlayers = $grid.find('[class*="awayPlayer"] .bb-scheduleTable__player').map((_, el) => $(el).text().trim()).get();

        // 球場
        const stadium = $tr.find('.bb-scheduleTable__data--stadium').text().trim();

        // gameId がない場合はスキップ
        if (!gameId && !homeName) return;

        games.push({
          gameId,
          url: gameUrl,
          homeTeam: homeName,
          awayTeam: awayName,
          homeScore,
          awayScore,
          status,
          startTime,
          homePlayers,   // ["(予)竹丸"] or ["(勝)加藤", "(S)マーセル"]
          awayPlayers,
          stadium,
        });
      });
    });

    res.status(200).json({ date: dateStr, games });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
