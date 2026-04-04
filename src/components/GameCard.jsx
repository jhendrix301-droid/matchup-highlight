import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateAdvancedMatchup } from '../matchupAnalysis';
import PitcherVsLineup from './PitcherVsLineup';
import { PITCHER_LAST_YEAR } from '../data/pitcherLastYearStats';

// チーム名→ロゴファイル名マッピング
const TEAM_LOGO = {
  '阪神': '/logos/T.png',
  '巨人': '/logos/G.png',
  'DeNA': '/logos/DB.png',
  '広島': '/logos/C.png',
  '中日': '/logos/D.png',
  'ヤクルト': '/logos/S.png',
  'ソフトバンク': '/logos/H.png',
  '日本ハム': '/logos/F.png',
  'オリックス': '/logos/Bs.png',
  '楽天': '/logos/E.png',
  '西武': '/logos/L.png',
  'ロッテ': '/logos/M.png',
};
function TeamLogo({ team, size = 24, className = '' }) {
  const src = TEAM_LOGO[team];
  if (!src) return null;
  return <img src={src} alt={team} width={size} height={size} className={`team-logo ${className}`} />;
}

// ラインナップの中から投手に最も相性の良い打者を1人選ぶ
function getFeaturedBatter(pitcherName, lineup) {
  if (!pitcherName || pitcherName === '---' || !lineup || lineup.length === 0) return null;
  let best = null;
  let bestScore = -1;
  for (const batter of lineup) {
    const name = batter.name || batter.lastName || '---';
    if (name === '---') continue;
    const a = calculateAdvancedMatchup(pitcherName, name, 1, 1, null, 0, 0, 0, 0, 0, null, true);
    const score = 100 - a.pitcherAdvPercentage;
    if (score > bestScore) {
      bestScore = score;
      best = { batter, analysis: a, batterAdv: score };
    }
  }
  return best;
}

// 打率文字列 → 数値（"-" や空は null）
function parseAvg(s) {
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// ラインナップから注目に値する選手を見つける
// 返り値: { batter, tag, reason } または null
function findNotablePlayer(lineup) {
  if (!lineup || lineup.length === 0) return null;
  let hotPlayer = null;      // 好調（打率.320以上）
  let coldPlayer = null;     // 不振（打率.150以下、ただし打席がある選手）
  let topCleanup = null;     // クリーンアップ（3〜5番）最高打率

  for (const b of lineup) {
    const avg = parseAvg(b.avg);
    if (avg === null) continue;
    if (avg >= 0.320 && (!hotPlayer || avg > parseAvg(hotPlayer.avg))) {
      hotPlayer = b;
    }
    // 打率.000は打席なしの可能性があるので除外
    if (avg > 0 && avg <= 0.150 && (!coldPlayer || avg < parseAvg(coldPlayer.avg))) {
      coldPlayer = b;
    }
    if ([3, 4, 5].includes(b.order)) {
      const ca = parseAvg(b.avg);
      if (ca !== null && (!topCleanup || ca > parseAvg(topCleanup.avg))) {
        topCleanup = b;
      }
    }
  }

  if (hotPlayer) return { batter: hotPlayer, tag: 'hot', avg: parseAvg(hotPlayer.avg) };
  if (coldPlayer) return { batter: coldPlayer, tag: 'cold', avg: parseAvg(coldPlayer.avg) };
  if (topCleanup) return { batter: topCleanup, tag: 'cleanup', avg: parseAvg(topCleanup.avg) };
  return null;
}

// 投手名から強度スコアを推定（ハッシュベース、0-100）
function getPitcherStrength(pitcherName) {
  if (!pitcherName || pitcherName === '---') return 50;
  return calculateAdvancedMatchup(pitcherName, '---', 1, 1, null, 0, 0, 0, 0, 0, null, true).pitcherAdvPercentage;
}

// 投手の状況を表す短い形容詞（試合前の選手状態として自然な表現）
function pitcherAdj(adv) {
  if (adv >= 63) return '今季好調の';
  if (adv >= 57) return '安定感ある';
  if (adv >= 53) return 'ローテの一角';
  if (adv >= 47) return '先発ローテ入り';
  if (adv <= 40) return '本調子を欠く';
  if (adv <= 46) return '直近登板で苦しむ';
  return '先発ローテ入り';
}

// 試合前専用: 投手情報・前回登板・前季成績をもとに見どころ生成（最大100字）
function generatePreGameHighlight(
  homePitcher, awayPitcher, homeTeam, awayTeam,
  homePitcherStats, awayPitcherStats,
  homeStandings, awayStandings
) {
  const hp = homePitcher && homePitcher !== '---';
  const ap = awayPitcher && awayPitcher !== '---';
  if (!hp && !ap) return '';

  const homeLY = hp ? PITCHER_LAST_YEAR[homePitcher] : null;
  const awayLY = ap ? PITCHER_LAST_YEAR[awayPitcher] : null;
  const homeAdv = hp ? getPitcherStrength(homePitcher) : 50;
  const awayAdv = ap ? getPitcherStrength(awayPitcher) : 50;
  const homeStrong = homeAdv >= 57;
  const awayStrong = awayAdv >= 57;
  const homeWeak   = homeAdv <= 46;
  const awayWeak   = awayAdv <= 46;

  const homeEra = homePitcherStats?.era ? `今季防${homePitcherStats.era}` : null;
  const awayEra = awayPitcherStats?.era ? `今季防${awayPitcherStats.era}` : null;
  const homeLYStr = homeLY ? `前季${homeLY.wins}勝${homeLY.losses}敗` : null;
  const awayLYStr = awayLY ? `前季${awayLY.wins}勝${awayLY.losses}敗` : null;
  const homeInfo = homeEra || homeLYStr;
  const awayInfo = awayEra || awayLYStr;

  const homeCond = homePitcherStats?.condition || '';
  const awayCond = awayPitcherStats?.condition || '';
  const homeRecent = homePitcherStats?.recentGames?.[0] || null;
  const awayRecent = awayPitcherStats?.recentGames?.[0] || null;

  // 片方のみ
  if (!hp && ap) {
    const inf = awayInfo ? `（${awayInfo}）` : '';
    return `${awayTeam}の${awayPitcher}${inf}が先発。${homeTeam}打線が早めに捕まえられるか、序盤の攻防に注目したい`;
  }
  if (hp && !ap) {
    const inf = homeInfo ? `（${homeInfo}）` : '';
    return `${homeTeam}の${homePitcher}${inf}が先発。立ち上がりのリズムが今日の試合の行方を大きく左右する`;
  }

  const cands = [];

  // 絶好調×エース対決
  if (homeCond === '絶好調' && awayStrong) {
    const ar = awayLY ? `前季${awayLY.wins}勝の` : '';
    cands.push({ s: 10, t: `絶好調の${homePitcher}と${ar}${awayPitcher}のエース対決。ともに一歩も引かない投手戦は終盤まで緊張が続きそうだ` });
  }
  if (awayCond === '絶好調' && homeStrong) {
    const hr = homeLY ? `前季${homeLY.wins}勝の` : '';
    cands.push({ s: 10, t: `${awayPitcher}が絶好調で先発。${hr}${homePitcher}との投げ合いは1点の重みが増す。終盤の息詰まる攻防から目が離せない` });
  }
  if (homeCond === '絶好調' && !awayStrong) {
    cands.push({ s: 8, t: `絶好調の${homePitcher}が今日も先発。${awayTeam}打線が崩せるポイントを早めに見つけないと、試合は一方的になりかねない` });
  }
  if (awayCond === '絶好調' && !homeStrong) {
    cands.push({ s: 8, t: `好調を維持する${awayPitcher}が先発。${homeTeam}は立ち上がりを攻め、早めにリズムを崩したいところだ` });
  }

  // 直近登板あり
  if (homeRecent?.ip) {
    const runsP = homeRecent.runs != null ? `${homeRecent.runs}失点` : '';
    const res = homeRecent.result === '勝' ? '前回の好投を今日もつなげるか' :
                homeRecent.result === '敗' ? '前回の悔しい敗戦を今日こそ払拭できるか' : '前回の課題を修正して臨む';
    cands.push({ s: 7, t: `前回${homeRecent.ip}回${runsP}の${homePitcher}が先発。${res}。${awayPitcher}との投手戦が今日の試合を締める` });
  }
  if (awayRecent?.ip) {
    const runsP = awayRecent.runs != null ? `${awayRecent.runs}失点` : '';
    const res = awayRecent.result === '勝' ? '前回の勢いそのまま白星を重ねるか' :
                awayRecent.result === '敗' ? 'リベンジを誓って今日のマウンドへ' : '前回から修正を加えて臨む';
    cands.push({ s: 7, t: `前回${awayRecent.ip}回${runsP}の${awayPitcher}が先発。${res}。${homePitcher}との投球術の対決は見応え十分` });
  }

  // エース対決（両強）
  if (homeStrong && awayStrong) {
    const hi = homeLY ? `前季${homeLY.wins}勝の` : '';
    const ai = awayLY ? `前季${awayLY.wins}勝の` : '';
    cands.push({ s: 6, t: `${hi}${homePitcher}と${ai}${awayPitcher}によるエース対決。ロースコアで推移すれば終盤の1点が試合の明暗を分ける緊張の展開となりそうだ` });
  }

  // 強 vs 弱
  if (homeStrong && awayWeak) {
    const ai = awayInfo ? `（${awayInfo}）の` : 'が';
    cands.push({ s: 5, t: `本調子でない${awayPitcher}${ai}先発。${homeTeam}打線は序盤から積極的に攻め、${homePitcher}に楽な展開を作ってあげたい` });
  }
  if (awayStrong && homeWeak) {
    const ai = awayInfo ? `${awayInfo}の` : '';
    cands.push({ s: 5, t: `${ai}${awayPitcher}が先発。対する${homePitcher}は本調子でなく早めの継投も視野に。${homeTeam}は序盤の粘りが生命線になる` });
  }
  if (homeStrong && !awayWeak) {
    const hi = homeLYStr ? `（${homeLYStr}）の` : 'が';
    cands.push({ s: 4, t: `${homePitcher}${hi}先発。先行逃げ切りが見えてくる試合展開になるか。${awayTeam}は序盤のチャンスを確実にものにしたい` });
  }
  if (awayStrong && !homeWeak) {
    const ai = awayLYStr ? `（${awayLYStr}）の` : 'が';
    cands.push({ s: 4, t: `${awayPitcher}${ai}先発。${homeTeam}打線が序盤から捕まえられれば試合が動く。一発のある打者の一振りに期待したい` });
  }

  // 両者不安定
  if (homeWeak && awayWeak) {
    cands.push({ s: 3, t: `両先発ともに最近は安定感を欠いている。打線の奮起次第でどちらが勝つか読めない、乱打戦もありうる展開だ` });
  }

  // デフォルト
  const di = (homeLY && awayLY)
    ? `前季${awayLY.wins}勝の${awayPitcher}と${homeLY.wins}勝の${homePitcher}の`
    : `${awayPitcher}と${homePitcher}の`;
  cands.push({ s: 1, t: `${di}先発対決。序盤の主導権争いがそのまま試合の流れをつくるだけに、両チームの初回の攻防から見逃せない` });

  cands.sort((a, b) => b.s - a.s);
  return cands[0].t;
}

// 試合の見どころテキスト生成（最大100字、前回登板・チーム状況・打者データを活用）
function generateHighlight(
  homePitcher, awayPitcher, homeTeam, awayTeam, lineupAway, lineupHome,
  homePitcherStats, awayPitcherStats, homeStandings, awayStandings
) {
  const hp = homePitcher && homePitcher !== '---';
  const ap = awayPitcher && awayPitcher !== '---';
  if (!hp && !ap) return '';

  const hasLineup = lineupAway.length > 0 || lineupHome.length > 0;

  // スタメン未発表: 投手情報だけで生成
  if (!hasLineup) {
    return generatePreGameHighlight(
      homePitcher, awayPitcher, homeTeam, awayTeam,
      homePitcherStats, awayPitcherStats,
      homeStandings, awayStandings
    );
  }

  // ラインナップあり: 打者データを活用
  const featAway = getFeaturedBatter(homePitcher, lineupAway);
  const featHome = getFeaturedBatter(awayPitcher, lineupHome);
  const awayAdv = featAway?.batterAdv ?? 50;
  const homeAdv = featHome?.batterAdv ?? 50;

  const notableAway = findNotablePlayer(lineupAway);
  const notableHome = findNotablePlayer(lineupHome);

  const homeLY = hp ? PITCHER_LAST_YEAR[homePitcher] : null;
  const awayLY = ap ? PITCHER_LAST_YEAR[awayPitcher] : null;
  const homeRecent = homePitcherStats?.recentGames?.[0] || null;
  const awayRecent = awayPitcherStats?.recentGames?.[0] || null;

  const cands = [];

  // 好調選手フィーチャー
  if (notableAway?.tag === 'hot') {
    const avg = notableAway.avg.toFixed(3);
    const pi = homeLY ? `前季${homeLY.wins}勝の` : '';
    cands.push({ s: 5, t: `打率${avg}と絶好調の${notableAway.batter.name}が${pi}${homePitcher}をどう崩すか。${awayTeam}の得点源として今日も一打に期待がかかる` });
  }
  if (notableHome?.tag === 'hot') {
    const avg = notableHome.avg.toFixed(3);
    const pi = awayLY ? `前季${awayLY.wins}勝の` : '';
    cands.push({ s: 5, t: `打率${avg}と絶好調の${notableHome.batter.name}が${pi}${awayPitcher}攻略の切り札に。長打も出やすい状況での一打に注目` });
  }

  // 不振選手フィーチャー
  if (notableAway?.tag === 'cold') {
    const avg = notableAway.avg.toFixed(3);
    cands.push({ s: 4, t: `打率${avg}と苦しむ${notableAway.batter.name}がここで一打を放てるか。${awayTeam}の打線再建は彼の復調にかかっている` });
  }
  if (notableHome?.tag === 'cold') {
    const avg = notableHome.avg.toFixed(3);
    cands.push({ s: 4, t: `本調子でない${notableHome.batter.name}（打率${avg}）が今日こそ一本を。チームの援護次第で試合の行方も変わる` });
  }

  // 大幅有利マッチアップ
  if (awayAdv >= 62 && featAway) {
    const pi = homeLY ? `前季防${homeLY.era}の` : '';
    cands.push({ s: 6, t: `${featAway.batter.name}vs${pi}${homePitcher}は打者が圧倒的有利。走者を溜めたときの勝負どころが今日最大の見せ場になりそうだ` });
  }
  if (homeAdv >= 62 && featHome) {
    const pi = awayLY ? `前季防${awayLY.era}の` : '';
    cands.push({ s: 6, t: `${featHome.batter.name}が${pi}${awayPitcher}を得意としている。打席が回るたびにスタンドが沸く好マッチアップに注目` });
  }

  // 前回登板から続く流れ
  if (homeRecent?.ip && homeRecent.result === '勝') {
    const runsP = homeRecent.runs != null ? `${homeRecent.runs}失点` : '';
    cands.push({ s: 5, t: `前回${homeRecent.ip}回${runsP}で好投した${homePitcher}が連続好投を狙う。今日のスタメンとの相性が試合のカギを握る` });
  }
  if (awayRecent?.ip && awayRecent.result === '負') {
    const runsP = awayRecent.runs != null ? `${awayRecent.runs}失点` : '';
    cands.push({ s: 5, t: `前回${awayRecent.ip}回${runsP}と打ち込まれた${awayPitcher}。今日は立て直してくるか、${homeTeam}打線が再び攻略できるか注目` });
  }

  // 投手有利（投手戦）
  if (awayAdv <= 42 && homeAdv <= 42 && hp && ap) {
    const hi = homeLY ? `前季防${homeLY.era}の` : '';
    const ai = awayLY ? `前季防${awayLY.era}の` : '';
    cands.push({ s: 5, t: `${hi}${homePitcher}と${ai}${awayPitcher}が打線を圧倒。ロースコアで進む中、わずかなミスが致命傷になる緊張感あふれる展開になりそうだ` });
  } else if (awayAdv <= 42 && hp) {
    cands.push({ s: 4, t: `${homePitcher}が今日も${awayTeam}打線を封じ込めれば完封ペース。先制点を許さない守りの野球が${homeTeam}の勝利の条件だ` });
  } else if (homeAdv <= 42 && ap) {
    cands.push({ s: 4, t: `${awayPitcher}が本来の投球を見せれば${homeTeam}打線は沈黙する可能性も。早い回にどこかで崩せるかが勝利へのカギ` });
  }

  // クリーンアップ
  if (notableAway?.tag === 'cleanup' && notableAway.avg >= 0.280) {
    cands.push({ s: 3, t: `${notableAway.batter.name}ら${awayTeam}クリーンアップが一本出れば試合が動く。${homePitcher}がどこまで踏ん張れるかに注目` });
  }

  // デフォルト
  if (hp && ap) {
    const ai = awayLY ? `前季${awayLY.wins}勝の` : '';
    const hi = homeLY ? `前季${homeLY.wins}勝の` : '';
    cands.push({ s: 1, t: `${ai}${awayPitcher}と${hi}${homePitcher}の先発対決。スタメン打線が早い回に得点を重ねられるかどうかが試合の流れを決める` });
  }

  if (cands.length === 0) return '';
  cands.sort((a, b) => b.s - a.s);
  return cands[0].t;
}

// 試合前専用: 先発投手プロフィール比較パネル
function PitcherProfileCard({ pitcher, team, side, pitcherStats }) {
  if (!pitcher || pitcher === '---') {
    return (
      <div className={`pgp-card pgp-card--${side}`}>
        <div className="pgp-team">{team}</div>
        <div className="pgp-name pgp-name--tbd">未定</div>
        <div className="pgp-label">先発投手</div>
      </div>
    );
  }
  const adv = getPitcherStrength(pitcher);
  const adj = pitcherAdj(adv);
  const adjLabel = adj.replace(/の$/, '');
  const isStrong = adv >= 57;
  const isWeak = adv <= 46;
  const hasEra = pitcherStats && pitcherStats.era !== null;
  const isFirstStart = pitcherStats && pitcherStats.era === null; // ERA未記録＝今季初登板の可能性
  return (
    <div className={`pgp-card pgp-card--${side} ${isStrong ? 'pgp-card--strong' : isWeak ? 'pgp-card--weak' : ''}`}>
      <div className="pgp-team">{team}</div>
      <div className="pgp-name">{pitcher}</div>
      {/* 前シーズン成績 */}
      {(() => {
        const ly = PITCHER_LAST_YEAR[pitcher];
        return ly ? (
          <div className="pgp-last-year">
            前季 {ly.wins}勝{ly.losses}敗 防{ly.era}
          </div>
        ) : (
          pitcherStats?.throwing ? (
            <div className="pgp-last-year pgp-last-year--none">{pitcherStats.throwing}投げ</div>
          ) : null
        );
      })()}
      {hasEra ? (
        <div className="pgp-season-stats">
          <span className="pgp-era">防御率 {pitcherStats.era}</span>
          <span className={`pgp-condition pgp-condition--${
            pitcherStats.condition === '絶好調' ? 'great' :
            pitcherStats.condition === '好調'   ? 'good'  :
            pitcherStats.condition === '不調'   ? 'bad'   : 'normal'
          }`}>
            {pitcherStats.condition || adjLabel}
          </span>
        </div>
      ) : (
        <div className="pgp-adj">
          {isFirstStart ? '今季初登板か' : adjLabel}
        </div>
      )}
    </div>
  );
}

// 直近登板フォームバッジ (勝/敗/-) を生成
function RecentForm({ games }) {
  if (!games || games.length === 0) return null;
  return (
    <div className="pgp-recent-form">
      {games.slice(0, 4).map((g, i) => (
        <span
          key={i}
          className={`pgp-form-dot pgp-form-dot--${g.result === '勝' ? 'win' : g.result === '敗' ? 'loss' : 'nd'}`}
          title={`${g.date} vs${g.opponent} ${g.result||'ND'} ${g.ip}回 ${g.runs}失点`}
        >
          {g.result || '―'}
        </span>
      ))}
    </div>
  );
}

function PreGamePitcherPanel({ homePitcher, awayPitcher, homeTeam, awayTeam, homePitcherStats, awayPitcherStats, homeStandings, awayStandings }) {
  const homeAdv = getPitcherStrength(homePitcher);
  const awayAdv = getPitcherStrength(awayPitcher);
  const bothKnown = (homePitcher && homePitcher !== '---') && (awayPitcher && awayPitcher !== '---');

  return (
    <div className="pgp-wrap">
      <div className="pgp-heading">先発投手</div>
      <div className="pgp-row">
        <PitcherProfileCard pitcher={awayPitcher} team={awayTeam} side="away" pitcherStats={awayPitcherStats} />
        <div className="pgp-vs">VS</div>
        <PitcherProfileCard pitcher={homePitcher} team={homeTeam} side="home" pitcherStats={homePitcherStats} />
      </div>

      {/* 直近登板フォーム */}
      {(awayPitcherStats?.recentGames?.length > 0 || homePitcherStats?.recentGames?.length > 0) && (
        <div className="pgp-recent-row">
          <div className="pgp-recent-block">
            <div className="pgp-recent-label">直近登板</div>
            <RecentForm games={awayPitcherStats?.recentGames} />
          </div>
          <div className="pgp-recent-sep" />
          <div className="pgp-recent-block pgp-recent-block--right">
            <div className="pgp-recent-label">直近登板</div>
            <RecentForm games={homePitcherStats?.recentGames} />
          </div>
        </div>
      )}

      {/* チーム成績 */}
      {(awayStandings || homeStandings) && (
        <div className="pgp-team-stats">
          <div className="pgp-team-stat-block">
            {awayStandings && (
              <>
                <span className="pgp-ts-team">{awayTeam}</span>
                <span className="pgp-ts-record">{awayStandings.wins}勝{awayStandings.losses}敗</span>
                <span className="pgp-ts-pct"><span className="pgp-ts-label">勝率</span> {awayStandings.pct}</span>
                <span className="pgp-ts-detail">打率 {awayStandings.avg} / 防御率 {awayStandings.era}</span>
              </>
            )}
          </div>
          <div className="pgp-team-stat-sep">|</div>
          <div className="pgp-team-stat-block pgp-team-stat-block--right">
            {homeStandings && (
              <>
                <span className="pgp-ts-team">{homeTeam}</span>
                <span className="pgp-ts-record">{homeStandings.wins}勝{homeStandings.losses}敗</span>
                <span className="pgp-ts-pct"><span className="pgp-ts-label">勝率</span> {homeStandings.pct}</span>
                <span className="pgp-ts-detail">打率 {homeStandings.avg} / 防御率 {homeStandings.era}</span>
              </>
            )}
          </div>
        </div>
      )}

      {bothKnown && (
        <div className="pgp-comparison">
          <div className="pgp-comparison-bar">
            <span className="pgp-cmp-label pgp-cmp-label--away">{awayPitcher} {awayAdv}%</span>
            <div className="pgp-cmp-track">
              <div className="pgp-cmp-away" style={{ width: `${awayAdv}%` }} />
              <div className="pgp-cmp-home" style={{ width: `${homeAdv}%` }} />
            </div>
            <span className="pgp-cmp-label pgp-cmp-label--home">{homePitcher} {homeAdv}%</span>
          </div>
        </div>
      )}

      <div className="pgp-notice">
        📋 スタメン発表後にラインナップ対戦データを自動表示
      </div>
    </div>
  );
}

const TEAM_COLORS = {
  '巨人':         '#ff6600',
  'DeNA':         '#003087',
  '阪神':         '#ffe100',
  '広島':         '#e40012',
  'ヤクルト':     '#00a0e9',
  '中日':         '#003087',
  '日本ハム':     '#003087',
  'ソフトバンク': '#ffd700',
  '楽天':         '#870012',
  'ロッテ':       '#000000',
  '西武':         '#003087',
  'オリックス':   '#0068b7',
};

function StatusBadge({ status, inning }) {
  if (status === 'final') return <span className="v2-badge v2-badge--final">試合終了</span>;
  if (status === 'live')  return <span className="v2-badge v2-badge--live">● 試合中 {inning || ''}</span>;
  return <span className="v2-badge v2-badge--pre">試合前</span>;
}

export default function GameCard({ game, standings = {}, forceFinal = false }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [lineupOpen, setLineupOpen] = useState(false);
  const [activeTeamTab, setActiveTeamTab] = useState(0);
  const [useRelieverHome, setUseRelieverHome] = useState(false);
  const [useRelieverAway, setUseRelieverAway] = useState(false);
  const [gameStats, setGameStats] = useState(null);
  const [pgTab, setPgTab] = useState('overview'); // overview | batters | pitchers

  const {
    awayTeam, homeTeam,
    awayScore, homeScore,
    status, inning,
    awayStartingPitcher, homeStartingPitcher,
    currentPitcher, currentAwayPitcher, currentBatter,
    lineupAway = [], lineupHome = [],
    benchAway = [], benchHome = [],
    homePlayers = [], awayPlayers = [],
    homePitcherStats = null,
    awayPitcherStats = null,
    startTime = '',
    stadium = '',
  } = game;

  const homeStandings = standings[homeTeam] || null;
  const awayStandings = standings[awayTeam] || null;

  // 予告先発（schedule データから）
  const predHomePitcher = homePlayers[0]?.replace(/^\(予\)|^\(先\)|^\(投\)|^\(打\)/, '').trim() || '';
  const predAwayPitcher = awayPlayers[0]?.replace(/^\(予\)|^\(先\)|^\(投\)|^\(打\)/, '').trim() || '';

  const hasLineup = lineupAway.length > 0;

  // 役割プレフィックスを除去
  const cleanName = (n) => (n || '').replace(/^\(予\)|^\(先\)|^\(投\)|^\(打\)/, '').trim() || '---';

  // 表/裏判定: 裏ならアウェイが投手、ホームが打者
  const isBottom = inning && inning.includes('裏');

  // ライブ時の投手・打者を表裏に基づいて正しく割り当て
  let pitcherName, batterName, pitcherTeamName, batterTeamName;
  if (status === 'live') {
    if (isBottom) {
      // 裏: アウェイが投げる、ホームが打つ
      pitcherName = cleanName(currentAwayPitcher) || cleanName(awayStartingPitcher) || cleanName(predAwayPitcher);
      batterName = currentBatter || (hasLineup ? lineupHome[0]?.name || lineupHome[0]?.lastName : null) || '---';
      pitcherTeamName = awayTeam;
      batterTeamName = homeTeam;
    } else {
      // 表: ホームが投げる、アウェイが打つ
      pitcherName = cleanName(currentPitcher) || cleanName(homeStartingPitcher) || cleanName(predHomePitcher);
      batterName = currentBatter || (hasLineup ? lineupAway[0]?.name || lineupAway[0]?.lastName : null) || '---';
      pitcherTeamName = homeTeam;
      batterTeamName = awayTeam;
    }
  } else {
    // 試合前・終了: 先発投手同士
    pitcherName = cleanName(homeStartingPitcher) || cleanName(predHomePitcher);
    batterName = (hasLineup ? lineupAway[0]?.name || lineupAway[0]?.lastName : null) || '---';
    pitcherTeamName = homeTeam;
    batterTeamName = awayTeam;
  }

  const analysis = calculateAdvancedMatchup(
    pitcherName, batterName,
    1, 1,
    null, 0, 0, 0, 0, 0, null,
    true
  );

  const adv = analysis.pitcherAdvPercentage;
  const advType = adv >= 55 ? 'pitcher' : adv <= 45 ? 'batter' : 'neutral';
  const hasRealMatchup = pitcherName !== '---' && batterName !== '---';

  const favorLabel = !hasRealMatchup
    ? 'スタメン発表後に更新'
    : analysis.favoredPlayer === pitcherName
    ? `${pitcherName} 優位`
    : analysis.favoredPlayer === batterName
    ? `${batterName} 優位`
    : '互角';

  const isFinal = status === 'final' || forceFinal;

  // 試合終了時に詳細成績を取得
  useEffect(() => {
    if (!isFinal || gameStats || !game.gameId) return;
    fetch(`/api/game-stats?id=${game.gameId}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setGameStats(d); })
      .catch(() => {});
  }, [isFinal, game.gameId]);

  const homePitcher = homeStartingPitcher || predHomePitcher;
  const awayPitcher = awayStartingPitcher || predAwayPitcher;

  // 投手交代検出: 現在の投手が先発と異なるか
  const homeReliever = (currentPitcher && cleanName(currentPitcher) !== '---' && cleanName(currentPitcher) !== cleanName(homePitcher))
    ? cleanName(currentPitcher) : null;
  const awayReliever = (currentAwayPitcher && cleanName(currentAwayPitcher) !== '---' && cleanName(currentAwayPitcher) !== cleanName(awayPitcher))
    ? cleanName(currentAwayPitcher) : null;
  // 現在マウンドにいるチーム側の交代情報
  const pitcherChanged = status === 'live' && (isBottom ? !!awayReliever : !!homeReliever);
  const starterName = isBottom ? cleanName(awayPitcher) : cleanName(homePitcher);
  const relieverName = isBottom ? awayReliever : homeReliever;

  const highlightText = generateHighlight(
    homePitcher, awayPitcher, homeTeam, awayTeam, lineupAway, lineupHome,
    homePitcherStats, awayPitcherStats, homeStandings, awayStandings
  );

  // 注目選手: 各チームのラインナップから相手投手に最も相性が良い打者
  const featuredAwayPlayer = getFeaturedBatter(homePitcher, lineupAway);
  const featuredHomePlayer = getFeaturedBatter(awayPitcher, lineupHome);

  return (
    <motion.div
      className={`v2-game-card v2-game-card--${advType} ${isFinal ? 'v2-game-card--final' : ''}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* ========== 折りたたみヘッダー（常に表示） ========== */}
      <div
        className="v2-card-header v2-card-header--clickable"
        onClick={() => setIsExpanded(v => !v)}
        role="button"
        aria-expanded={isExpanded}
      >
        <div className={`v2-teams ${isFinal ? 'v2-teams--final' : ''}`}>
          <span className="v2-team v2-team--away">
            <TeamLogo team={awayTeam} size={isFinal ? 28 : 22} />
            <span className="v2-team-name">{awayTeam || '—'}</span>
          </span>
          <div className={`v2-score-box ${isFinal ? 'v2-score-box--final' : ''}`}>
            {status !== 'pre'
              ? <><span className="v2-score-num">{awayScore ?? '-'}</span> <span className="v2-score-sep">-</span> <span className="v2-score-num">{homeScore ?? '-'}</span></>
              : <span className="v2-score-vs">VS</span>
            }
          </div>
          <span className="v2-team v2-team--home">
            <TeamLogo team={homeTeam} size={isFinal ? 28 : 22} />
            <span className="v2-team-name">{homeTeam || '—'}</span>
          </span>
        </div>
        <div className="v2-header-right-row">
          <StatusBadge status={status} inning={inning} />
          <span className={`v2-chevron ${isExpanded ? 'v2-chevron--open' : ''}`}>›</span>
        </div>
      </div>
      {/* 試合時間・球場メタ情報 */}
      {(startTime || stadium) && (
        <div className="v2-card-meta">
          {startTime && <span className="v2-card-meta-time">▶ {startTime}</span>}
          {stadium && <span className="v2-card-meta-stadium">{stadium}</span>}
        </div>
      )}

      {/* ========== サマリー（折りたたみ時・スタメン未発表の試合前以外） ========== */}
      {!isExpanded && !(status === 'pre' && !hasLineup) && !isFinal && (
        <div className="v2-summary">
          {status === 'pre' ? (
            /* 試合前: 両先発投手を並べて表示 */
            <div className="v2-matchup-row">
              <div className="v2-player v2-player--pitcher">
                <div className="v2-player-label">先発</div>
                <div className="v2-player-name">{awayPitcher || '未定'}</div>
                <div className="v2-player-team">{awayTeam}</div>
              </div>
              <div className="v2-vs-center v2-vs-center--battle">
                <span className="v2-vs-spark v2-vs-spark--l" />
                <span className="v2-vs-text">VS</span>
                <span className="v2-vs-spark v2-vs-spark--r" />
              </div>
              <div className="v2-player v2-player--pitcher" style={{ textAlign: 'right' }}>
                <div className="v2-player-label" style={{ textAlign: 'right' }}>先発</div>
                <div className="v2-player-name">{homePitcher || '未定'}</div>
                <div className="v2-player-team" style={{ textAlign: 'right' }}>{homeTeam}</div>
              </div>
            </div>
          ) : (
            /* 試合中: 現在の投手 vs 打者 */
            <>
              {pitcherChanged && (
                <div className="v2-pitcher-change">
                  <span className="v2-pitcher-change-badge">🔄 投手交代</span>
                  <span className="v2-pitcher-change-detail">
                    <span className="v2-pitcher-change-prev">{starterName}</span>
                    <span className="v2-pitcher-change-arrow">→</span>
                    <span className="v2-pitcher-change-current">{relieverName}</span>
                  </span>
                </div>
              )}
              <div className="v2-matchup-row">
                <div className="v2-player v2-player--pitcher">
                  <div className="v2-player-role-tag v2-player-role-tag--pitcher">
                    {pitcherChanged ? '救援' : '投手'}
                  </div>
                  <div className="v2-player-name">{pitcherName}</div>
                  <div className="v2-player-team-badge">{pitcherTeamName}</div>
                </div>
                <div className="v2-vs-center v2-vs-center--battle">
                  <span className="v2-vs-spark v2-vs-spark--l" />
                  <span className="v2-vs-text">VS</span>
                  <span className="v2-vs-spark v2-vs-spark--r" />
                </div>
                <div className="v2-player v2-player--batter">
                  <div className="v2-player-role-tag v2-player-role-tag--batter">打者</div>
                  <div className="v2-player-name">{batterName}</div>
                  <div className="v2-player-team-badge">{batterTeamName}</div>
                </div>
              </div>
            </>
          )}

          <div className="v2-gauge-wrap">
            <div className="v2-gauge-labels">
              <span className={`v2-gauge-label ${advType === 'pitcher' ? 'v2-gauge-label--active' : ''}`}>
                投手 {adv}%
              </span>
              <span className={`v2-gauge-label v2-gauge-label--right ${advType === 'batter' ? 'v2-gauge-label--active' : ''}`}>
                打者 {100 - adv}%
              </span>
            </div>
            <div className="v2-gauge-track">
              <motion.div
                className={`v2-gauge-fill v2-gauge-fill--${advType}`}
                initial={{ width: '50%' }}
                animate={{
                  width: advType === 'pitcher' ? `${adv}%`
                       : advType === 'batter'  ? `${100 - adv}%`
                       : '50%',
                  left:  advType === 'batter' ? 'auto' : 0,
                  right: advType === 'batter' ? 0 : 'auto',
                }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
            </div>
            <div className="v2-favor-label">{favorLabel}</div>
          </div>

          {/* 投手・打者の実データ */}
          {hasRealMatchup && (
            <div className="v2-real-stats">
              <div className="v2-real-stats-row">
                <span className="v2-real-stats-side v2-real-stats-side--pitcher">投手</span>
                <span className="v2-real-stats-name">{pitcherName}</span>
                {(() => {
                  const ps = isBottom ? awayPitcherStats : homePitcherStats;
                  if (!ps) return null;
                  return (
                    <span className="v2-real-stats-detail">
                      {ps.era ? `防御率 ${ps.era}` : ''}{ps.condition ? ` ${ps.condition}` : ''}
                    </span>
                  );
                })()}
              </div>
              <div className="v2-real-stats-row">
                <span className="v2-real-stats-side v2-real-stats-side--batter">打者</span>
                <span className="v2-real-stats-name">{batterName}</span>
                {(() => {
                  const bl = isBottom ? lineupHome : lineupAway;
                  const b = bl.find(p => (p.name || p.lastName) === batterName);
                  if (!b || !b.avg) return null;
                  return <span className="v2-real-stats-detail">打率{b.avg} {b.pos}</span>;
                })()}
              </div>
            </div>
          )}

          {/* 試合の見どころ */}
          {highlightText && (
            <div className="v2-highlight">
              <span className="v2-highlight-icon">📍</span>
              <span className="v2-highlight-text">{highlightText}</span>
            </div>
          )}
        </div>
      )}

      {/* ===== 試合前・スタメン未発表: 先発投手情報 + ハイライト ===== */}
      {!isFinal && status === 'pre' && !hasLineup && (
        <div className="v2-pregame-section">
          <PreGamePitcherPanel
            homePitcher={homePitcher}
            awayPitcher={awayPitcher}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            homePitcherStats={homePitcherStats}
            awayPitcherStats={awayPitcherStats}
            homeStandings={homeStandings}
            awayStandings={awayStandings}
          />
          {highlightText && (
            <div className="v2-highlight v2-highlight--pregame">
              <span className="v2-highlight-icon">📍</span>
              <span className="v2-highlight-text">{highlightText}</span>
            </div>
          )}
        </div>
      )}

      {/* ===== 試合終了: 振り返りパネル ===== */}
      {isFinal && (
        <div className="v2-postgame">
          {/* 勝敗バナー */}
          {(() => {
            const homeWin = (homeScore ?? 0) > (awayScore ?? 0);
            const awayWin = (awayScore ?? 0) > (homeScore ?? 0);
            const draw = homeScore === awayScore;
            const winner = homeWin ? homeTeam : awayWin ? awayTeam : null;
            return (
              <div className={`v2-pg-result ${draw ? 'v2-pg-result--draw' : ''}`}>
                <span className="v2-pg-result-label">{draw ? '引き分け' : `${winner} 勝利`}</span>
              </div>
            );
          })()}

          {/* 今日のヒーロー */}
          {gameStats?.hero && (
            <div className="v2-pg-hero">
              <div className="v2-pg-hero-label">🏆 今日のヒーロー</div>
              <div className="v2-pg-hero-card">
                <div className="v2-pg-hero-name">{gameStats.hero.name}</div>
                {gameStats.hero.stats && (
                  <div className="v2-pg-hero-stats">{gameStats.hero.stats}</div>
                )}
                {gameStats.hero.reason && (
                  <div className="v2-pg-hero-reason">{gameStats.hero.reason}</div>
                )}
              </div>
            </div>
          )}

          {/* 戦評 */}
          {gameStats?.recap && (
            <div className="v2-pg-recap">
              <div className="v2-pg-recap-text">{gameStats.recap}</div>
            </div>
          )}

          {/* タブ切替: 概要 / 打者成績 / 投手成績 */}
          <div className="v2-pg-tabs">
            {[
              { key: 'overview', label: '選手評価' },
              { key: 'batters', label: '打者成績' },
              { key: 'pitchers', label: '投手成績' },
            ].map(t => (
              <button
                key={t.key}
                className={`v2-pg-tab ${pgTab === t.key ? 'v2-pg-tab--active' : ''}`}
                onClick={() => setPgTab(t.key)}
              >{t.label}</button>
            ))}
          </div>

          {!gameStats ? (
            <div className="v2-pg-loading">データ取得中...</div>
          ) : (
            <>
              {/* ===== 選手評価タブ ===== */}
              {pgTab === 'overview' && (() => {
                const allBatters = [
                  ...(gameStats.homeBatters || []).map(b => ({ ...b, team: homeTeam })),
                  ...(gameStats.awayBatters || []).map(b => ({ ...b, team: awayTeam })),
                ].filter(b => b.atBats > 0 || b.bb > 0 || b.hbp > 0);

                const allPitchers = [
                  ...(gameStats.homePitchers || []).map(p => ({ ...p, team: homeTeam })),
                  ...(gameStats.awayPitchers || []).map(p => ({ ...p, team: awayTeam })),
                ];

                // 打者評価: 安打2+, HR, 打点2+ → GOOD / 3三振, 0安打3打数+ → BAD
                const evalBatter = (b) => {
                  if (b.hr > 0 || b.hits >= 2 || b.rbi >= 2) return 'good';
                  if (b.so >= 3 || (b.atBats >= 3 && b.hits === 0 && b.bb === 0)) return 'bad';
                  return null;
                };

                // 投手評価: QS相当(6回以下3自責点), 勝/S → GOOD / 敗, 3失点+ → BAD
                const evalPitcher = (p) => {
                  const ip = parseFloat(p.ip) || 0;
                  if (p.result === '勝' || p.result === 'S' || (ip >= 6 && p.er <= 3)) return 'good';
                  if (p.result === '敗' || p.runs >= 3) return 'bad';
                  return null;
                };

                const goodPlayers = [
                  ...allBatters.filter(b => evalBatter(b) === 'good').map(b => ({ ...b, type: 'bat', eval: 'good' })),
                  ...allPitchers.filter(p => evalPitcher(p) === 'good').map(p => ({ ...p, type: 'pit', eval: 'good' })),
                ];
                const badPlayers = [
                  ...allBatters.filter(b => evalBatter(b) === 'bad').map(b => ({ ...b, type: 'bat', eval: 'bad' })),
                  ...allPitchers.filter(p => evalPitcher(p) === 'bad').map(p => ({ ...p, type: 'pit', eval: 'bad' })),
                ];

                return (
                  <div className="v2-pg-eval">
                    {goodPlayers.length > 0 && (
                      <div className="v2-pg-eval-group">
                        <div className="v2-pg-eval-label v2-pg-eval-label--good">GOOD!</div>
                        {goodPlayers.map((p, i) => (
                          <div key={`g${i}`} className="v2-pg-eval-row v2-pg-eval-row--good">
                            <div className="v2-pg-eval-header">
                              <TeamLogo team={p.team} size={22} className="eval-logo" />
                              <span className="v2-pg-eval-name">{p.name}</span>
                            </div>
                            <span className="v2-pg-eval-detail">
                              {p.type === 'bat'
                                ? `${p.hits}安打 ${p.rbi}打点${p.hr > 0 ? ` ${p.hr}HR` : ''}${p.sb > 0 ? ` ${p.sb}盗塁` : ''}`
                                : `${p.ip}回 ${p.so}K ${p.runs}失点${p.result ? ` ${p.result}` : ''}`
                              }
                            </span>
                            {p.type === 'bat' && p.avg && (
                              <span className="v2-pg-eval-season">通算打率 {p.avg}</span>
                            )}
                            {p.type === 'pit' && p.era && (
                              <span className="v2-pg-eval-season">通算防御率 {p.era}</span>
                            )}
                            {p.type === 'bat' && p.inningResults?.length > 0 && (
                              <div className="v2-pg-eval-innings">
                                {p.inningResults.map((r, j) => (
                                  <span key={j} className={`v2-pg-ab ${r.includes('安') || r.includes('２') || r.includes('３') || r.includes('本') ? 'v2-pg-ab--hit' : r.includes('三振') ? 'v2-pg-ab--so' : ''}`}>{r}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {badPlayers.length > 0 && (
                      <div className="v2-pg-eval-group">
                        <div className="v2-pg-eval-label v2-pg-eval-label--bad">BAD</div>
                        {badPlayers.map((p, i) => (
                          <div key={`b${i}`} className="v2-pg-eval-row v2-pg-eval-row--bad">
                            <div className="v2-pg-eval-header">
                              <TeamLogo team={p.team} size={22} className="eval-logo" />
                              <span className="v2-pg-eval-name">{p.name}</span>
                            </div>
                            <span className="v2-pg-eval-detail">
                              {p.type === 'bat'
                                ? `${p.hits}安打 ${p.so}三振${p.atBats > 0 ? ` (${p.atBats}打数)` : ''}`
                                : `${p.ip}回 ${p.runs}失点 被安打${p.hits}${p.result ? ` ${p.result}` : ''}`
                              }
                            </span>
                            {p.type === 'bat' && p.avg && (
                              <span className="v2-pg-eval-season">通算打率 {p.avg}</span>
                            )}
                            {p.type === 'pit' && p.era && (
                              <span className="v2-pg-eval-season">通算防御率 {p.era}</span>
                            )}
                            {p.type === 'bat' && p.inningResults?.length > 0 && (
                              <div className="v2-pg-eval-innings">
                                {p.inningResults.map((r, j) => (
                                  <span key={j} className={`v2-pg-ab ${r.includes('安') || r.includes('２') || r.includes('３') || r.includes('本') ? 'v2-pg-ab--hit' : r.includes('三振') ? 'v2-pg-ab--so' : ''}`}>{r}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ===== 打者成績タブ ===== */}
              {pgTab === 'batters' && (
                <div className="v2-pg-box">
                  {[
                    { label: awayTeam, batters: gameStats.awayBatters },
                    { label: homeTeam, batters: gameStats.homeBatters },
                  ].map((team, ti) => (
                    <div key={ti} className="v2-pg-box-team">
                      <div className="v2-pg-box-team-name"><TeamLogo team={team.label} size={20} />{team.label}</div>
                      {(team.batters || []).map((b, i) => (
                        <div key={i} className="v2-pg-batter-row">
                          <div className="v2-pg-batter-top">
                            <span className="v2-pg-batter-pos">{b.pos}</span>
                            <span className="v2-pg-batter-name">{b.name}</span>
                            <span className="v2-pg-batter-line">
                              {b.atBats}打数{b.hits}安打{b.rbi > 0 ? ` ${b.rbi}打点` : ''}{b.hr > 0 ? ` ${b.hr}HR` : ''}{b.bb > 0 ? ` ${b.bb}四球` : ''}{b.so > 0 ? ` ${b.so}三振` : ''}
                            </span>
                          </div>
                          {b.inningResults.length > 0 && (
                            <div className="v2-pg-batter-innings">
                              {b.inningResults.map((r, j) => (
                                <span key={j} className={`v2-pg-ab ${r.includes('安') || r.includes('２') || r.includes('３') || r.includes('本') ? 'v2-pg-ab--hit' : r.includes('三振') ? 'v2-pg-ab--so' : r.includes('四球') || r.includes('死球') ? 'v2-pg-ab--bb' : ''}`}>{r}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* ===== 投手成績タブ ===== */}
              {pgTab === 'pitchers' && (
                <div className="v2-pg-box">
                  {[
                    { label: awayTeam, pitchers: gameStats.awayPitchers },
                    { label: homeTeam, pitchers: gameStats.homePitchers },
                  ].map((team, ti) => (
                    <div key={ti} className="v2-pg-box-team">
                      <div className="v2-pg-box-team-name"><TeamLogo team={team.label} size={20} />{team.label}</div>
                      {(team.pitchers || []).map((p, i) => (
                        <div key={i} className="v2-pg-pitcher-row">
                          <div className="v2-pg-pitcher-top">
                            {p.result && <span className={`v2-pg-pitcher-result v2-pg-pitcher-result--${p.result === '勝' || p.result === 'S' ? 'win' : p.result === '敗' ? 'loss' : 'other'}`}>{p.result}</span>}
                            <span className="v2-pg-pitcher-name-box">{p.name}</span>
                            <span className="v2-pg-pitcher-era">防{p.era}</span>
                          </div>
                          <div className="v2-pg-pitcher-line">
                            <span>{p.ip}回</span>
                            <span>{p.pitches}球</span>
                            <span>{p.so}奪三振</span>
                            <span>被安打{p.hits}</span>
                            <span>{p.runs}失点</span>
                            {p.bb > 0 && <span>{p.bb}四球</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ===== 相性最高選手 ===== */}
      {!isFinal && hasLineup && (featuredAwayPlayer || featuredHomePlayer) && (
        <div className="v2-best-matchup-section">
          <div className="v2-best-matchup-header">⚡ 相性最高選手</div>
          <div className="v2-best-matchup-cards">
            {featuredAwayPlayer && (
              <div className={`v2-best-card ${featuredAwayPlayer.batterAdv >= 55 ? 'v2-best-card--hot' : ''}`}>
                <span className="v2-best-card-team">{awayTeam}</span>
                <span className="v2-best-card-name">{featuredAwayPlayer.batter.name || featuredAwayPlayer.batter.lastName || '---'}</span>
                <span className="v2-best-card-detail">
                  vs {homePitcher} → 打者有利 {featuredAwayPlayer.batterAdv}%
                </span>
                {featuredAwayPlayer.batter.avg && featuredAwayPlayer.batter.avg !== '-' && (
                  <span className="v2-best-card-avg">打率 {featuredAwayPlayer.batter.avg}</span>
                )}
              </div>
            )}
            {featuredHomePlayer && (
              <div className={`v2-best-card ${featuredHomePlayer.batterAdv >= 55 ? 'v2-best-card--hot' : ''}`}>
                <span className="v2-best-card-team">{homeTeam}</span>
                <span className="v2-best-card-name">{featuredHomePlayer.batter.name || featuredHomePlayer.batter.lastName || '---'}</span>
                <span className="v2-best-card-detail">
                  vs {awayPitcher} → 打者有利 {featuredHomePlayer.batterAdv}%
                </span>
                {featuredHomePlayer.batter.avg && featuredHomePlayer.batter.avg !== '-' && (
                  <span className="v2-best-card-avg">打率 {featuredHomePlayer.batter.avg}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== 対戦判定: アコーディオンで開閉 ===== */}
      {!isFinal && (
        <div className="v2-lineup-section">
          <button
            className={`v2-lineup-toggle ${lineupOpen ? 'v2-lineup-toggle--open' : ''}`}
            onClick={() => setLineupOpen(v => !v)}
            aria-expanded={lineupOpen}
          >
            <span className="v2-lineup-toggle-inner">
              <span className="v2-lineup-toggle-icon-wrap">
                <span className={`v2-lineup-toggle-chevron ${lineupOpen ? 'v2-lineup-toggle-chevron--open' : ''}`}>▶</span>
              </span>
              <span className="v2-lineup-toggle-content">
                <span className="v2-lineup-toggle-title">⚔️ 全選手マッチアップ分析</span>
                <span className="v2-lineup-toggle-sub">
                  {hasLineup
                    ? 'スタメン＋ベンチの相性を一覧'
                    : 'スタメン発表後に自動更新'}
                </span>
              </span>
            </span>
            {!lineupOpen && <span className="v2-lineup-toggle-hint">タップして開く</span>}
          </button>
          <AnimatePresence>
            {lineupOpen && (
              <motion.div
                className="v2-lineup-analysis"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                {/* チーム切替タブ */}
                {(() => {
                  const effectiveHomePitcher = (homeReliever && useRelieverHome) ? homeReliever : (homePitcher || '投手');
                  const effectiveAwayPitcher = (awayReliever && useRelieverAway) ? awayReliever : (awayPitcher || '投手');
                  return (
                    <>
                      <div className="v2-team-tabs">
                        <button
                          className={`v2-team-tab ${activeTeamTab === 0 ? 'v2-team-tab--active' : ''}`}
                          onClick={() => setActiveTeamTab(0)}
                        >
                          {effectiveHomePitcher} vs {awayTeam}
                        </button>
                        <button
                          className={`v2-team-tab ${activeTeamTab === 1 ? 'v2-team-tab--active' : ''}`}
                          onClick={() => setActiveTeamTab(1)}
                        >
                          {effectiveAwayPitcher} vs {homeTeam}
                        </button>
                      </div>

                      {/* 投手交代時: 先発⇔リリーフ切替 */}
                      {activeTeamTab === 0 && homeReliever && (
                        <div className="v2-pitcher-switch">
                          <button
                            className={`v2-pitcher-switch-btn ${!useRelieverHome ? 'v2-pitcher-switch-btn--active' : ''}`}
                            onClick={() => setUseRelieverHome(false)}
                          >
                            先発 {cleanName(homePitcher)}
                          </button>
                          <button
                            className={`v2-pitcher-switch-btn ${useRelieverHome ? 'v2-pitcher-switch-btn--active' : ''}`}
                            onClick={() => setUseRelieverHome(true)}
                          >
                            🔄 {homeReliever}
                          </button>
                        </div>
                      )}
                      {activeTeamTab === 1 && awayReliever && (
                        <div className="v2-pitcher-switch">
                          <button
                            className={`v2-pitcher-switch-btn ${!useRelieverAway ? 'v2-pitcher-switch-btn--active' : ''}`}
                            onClick={() => setUseRelieverAway(false)}
                          >
                            先発 {cleanName(awayPitcher)}
                          </button>
                          <button
                            className={`v2-pitcher-switch-btn ${useRelieverAway ? 'v2-pitcher-switch-btn--active' : ''}`}
                            onClick={() => setUseRelieverAway(true)}
                          >
                            🔄 {awayReliever}
                          </button>
                        </div>
                      )}

                      {activeTeamTab === 0 ? (
                        <PitcherVsLineup
                          pitcher={effectiveHomePitcher}
                          pitcherTeam={homeTeam}
                          lineup={lineupAway}
                          bench={benchAway}
                          opponentTeam={awayTeam}
                        />
                      ) : (
                        <PitcherVsLineup
                          pitcher={effectiveAwayPitcher}
                          pitcherTeam={awayTeam}
                          lineup={lineupHome}
                          bench={benchHome}
                          opponentTeam={homeTeam}
                        />
                      )}
                    </>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ========== 展開パネル ========== */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="v2-detail-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            {isFinal ? (
              /* 試合終了: 展開パネルは不要（振り返りはカード内に表示済み） */
              <div className="v2-final-summary">
                <div className="v2-final-note">📋 試合データは上に表示しています</div>
              </div>
            ) : (
              /* 試合前・試合中: 詳細情報 */
              <div className="v2-live-matchups">
                {(hasLineup || status === 'live') && (
                  <div className="pgp-notice">📋 スタメン対戦データはカード内に表示中</div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
