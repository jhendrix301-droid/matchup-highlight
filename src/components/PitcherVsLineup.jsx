import React, { useState } from 'react';
import { calculateAdvancedMatchup } from '../matchupAnalysis';
import MatchupRow from './MatchupRow';

// ベンチ打者の中から投手に強い上位3人を選ぶ
function getTopBenchRecommendations(pitcherName, benchPlayers, topN = 3) {
  if (!benchPlayers || benchPlayers.length === 0) return [];

  const scored = benchPlayers.map(batter => {
    const batterName = batter.name || batter.lastName || '---';
    const analysis = calculateAdvancedMatchup(
      pitcherName, batterName,
      1, 1,
      null, 0, 0, 0, 0, 0, null,
      true
    );
    return { batter, batterName, analysis };
  });

  // 打者優位スコアが高い順（100 - pitcherAdvPercentage が大きい順）
  scored.sort((a, b) =>
    (100 - a.analysis.pitcherAdvPercentage) - (100 - b.analysis.pitcherAdvPercentage)
  ).reverse();

  return scored.slice(0, topN);
}

export default function PitcherVsLineup({ pitcher, pitcherTeam, lineup, bench, opponentTeam }) {
  const pitcherName = pitcher || '---';
  const hasData = lineup && lineup.length > 0;

  const benchRecs = getTopBenchRecommendations(pitcherName, bench || []);

  return (
    <div className="pvl-wrap">
      {/* セクションヘッダー */}
      <div className="pvl-header">
        <span className="pvl-pitcher-team">{pitcherTeam}</span>
        <span className="pvl-pitcher-name">{pitcherName}</span>
        <span className="pvl-vs-label">先発</span>
        <span className="pvl-opponent">vs {opponentTeam} 打線</span>
      </div>

      {/* 打者リスト */}
      {hasData ? (
        <div className="pvl-lineup">
          {lineup.map((batter, i) => (
            <MatchupRow
              key={batter.name + i}
              pitcher={pitcherName}
              batter={batter}
              order={batter.order}
              animDelay={i * 0.04}
            />
          ))}
        </div>
      ) : (
        <div className="pvl-empty">スタメン未発表</div>
      )}

      {/* 代打の切り札 + 代打候補 */}
      {benchRecs.length > 0 && (
        <div className="pvl-bench-section">
          {/* 1位: 代打の切り札カード */}
          <div className="pvl-ace-card">
            <div className="pvl-ace-label">🔥 代打の切り札！</div>
            <div className="pvl-ace-body">
              <div className="pvl-ace-left">
                <span className="pvl-ace-name">{benchRecs[0].batter.name || benchRecs[0].batterName}</span>
                {benchRecs[0].batter.avg && benchRecs[0].batter.avg !== '-' && (
                  <span className="pvl-ace-avg">打率 {benchRecs[0].batter.avg}</span>
                )}
              </div>
              <div className="pvl-ace-right">
                <span className={`pvl-ace-adv ${(100 - benchRecs[0].analysis.pitcherAdvPercentage) >= 55 ? 'pvl-ace-adv--hot' : ''}`}>
                  打者{100 - benchRecs[0].analysis.pitcherAdvPercentage}%
                </span>
                <span className="pvl-ace-result">{benchRecs[0].analysis.expectedResult}</span>
              </div>
            </div>
            <div className="pvl-ace-reason">
              {`vs ${pitcherName}: ${
                (100 - benchRecs[0].analysis.pitcherAdvPercentage) >= 60
                  ? '大幅有利マッチアップ — ここで使いたい！'
                  : (100 - benchRecs[0].analysis.pitcherAdvPercentage) >= 55
                  ? '有利マッチアップ — 代打で一発狙える'
                  : 'ベンチ最良の選択肢'
              }`}
            </div>
          </div>
          {/* 2位以降: 代打候補 */}
          {benchRecs.slice(1).map((rec, i) => (
            <MatchupRow
              key={rec.batter.name + i}
              pitcher={pitcherName}
              batter={rec.batter}
              order={i + 2}
              isBench
              animDelay={0.45 + i * 0.05}
            />
          ))}
        </div>
      )}
    </div>
  );
}
