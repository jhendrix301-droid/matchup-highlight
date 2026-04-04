import React from 'react';
import { motion } from 'framer-motion';
import { calculateAdvancedMatchup } from '../matchupAnalysis';

// 予測結果の説明ラベル
const RESULT_LABEL = {
  '三振': '予測: 三振',
  '凡退': '予測: 凡退',
  '安打': '予測: 安打',
  '長打': '予測: 長打',
  '本塁打': '予測: 本塁打',
  '四球': '予測: 四球',
};

export default function MatchupRow({ pitcher, batter, order, isBench = false, animDelay = 0 }) {
  const pitcherName = pitcher?.lastName || pitcher || '---';
  // フルネーム表示（name があれば使用、なければ lastName）
  const batterFullName = batter?.name || batter?.lastName || batter || '---';
  const batterLastName = batter?.lastName || batter || '---';

  const analysis = calculateAdvancedMatchup(
    pitcherName, batterLastName,
    1, 1,
    null, 0, 0, 0, 0, 0, null,
    true
  );

  const adv = analysis.pitcherAdvPercentage;
  const advType = adv >= 55 ? 'pitcher' : adv <= 45 ? 'batter' : 'neutral';
  const batterPct = 100 - adv;

  // 打者有利度に応じたラベル
  const advLabel = advType === 'batter'
    ? (batterPct >= 60 ? '大幅有利' : '有利')
    : advType === 'pitcher'
    ? (adv >= 60 ? '不利' : 'やや不利')
    : '互角';

  return (
    <motion.div
      className={`mr-row mr-row--${advType} ${isBench ? 'mr-row--bench' : ''}`}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: animDelay }}
    >
      {/* 打順 */}
      <div className={`mr-order mr-order--${advType}`}>
        {isBench ? '代' : order}
      </div>

      {/* 打者名 + 打率 */}
      <div className="mr-batter">
        <span className="mr-batter-name">{batterFullName}</span>
        {batter?.avg && batter.avg !== '-' && batter.avg !== '' && (
          <span className="mr-batter-avg">打率 {batter.avg}{batter.pos ? ` / ${batter.pos}` : ''}</span>
        )}
      </div>

      {/* 有利不利バッジ */}
      <div className={`mr-adv-badge mr-adv-badge--${advType}`}>
        <span className="mr-adv-pct">
          {advType === 'batter' ? `${batterPct}%` : advType === 'pitcher' ? `${adv}%` : '50%'}
        </span>
        <span className="mr-adv-label">{advLabel}</span>
      </div>

      {/* 予測結果バッジ */}
      <div className={`mr-result mr-result--${analysis.expectedResult === '三振' || analysis.expectedResult === '凡退' ? 'out' : 'hit'}`}>
        {RESULT_LABEL[analysis.expectedResult] || analysis.expectedResult}
      </div>
    </motion.div>
  );
}
