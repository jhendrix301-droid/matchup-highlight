// matchupAnalysis.js
// 5要素に基づく対戦分析エンジン（軽量版）

// --- モックデータ生成用シード関数 ---
function hashString(str) {
  let hash = 0;
  if (!str || str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

function seededRandom(seed) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function generateMockData(pitcherName, batterName) {
  const seed = hashString(pitcherName + batterName);

  // 1. 直近の勢い (0-100)
  const formScore = Math.floor(seededRandom(seed + 2) * 100);

  // 2. 球種・適合性 (0-100)
  const pitchScore = Math.floor(seededRandom(seed + 3) * 100);

  // 3. 球場・状況補正 (0-100)
  const parkScore = Math.floor(seededRandom(seed + 4) * 100);

  return { formScore, pitchScore, parkScore };
}

export function calculateAdvancedMatchup(
  pitcherName, batterName, pThrow, bBat,
  h2hAvg, h2hAB, h2hHits, h2hHR, h2hSO, h2hBB, h2hOPS,
  isNoData = false
) {
  // 5項目の重み (デフォルト)
  let weights = {
    h2h: 0.40,
    platoon: 0.20,
    form: 0.15,
    pitch: 0.15,
    park: 0.10
  };

  // サンプルサイズ(打席数)が十分ある場合は直接対決データを最重視する
  if (h2hAB >= 15) {
    weights = { h2h: 0.70, platoon: 0.10, form: 0.10, pitch: 0.05, park: 0.05 };
  } else if (h2hAB >= 10) {
    weights = { h2h: 0.55, platoon: 0.15, form: 0.10, pitch: 0.10, park: 0.10 };
  }

  const mock = generateMockData(pitcherName, batterName);
  
  // Platoon Score (属性相性)
  let platoonScore = 50;
  if (pThrow === 1 && bBat === 1) platoonScore = 55;      // 右投 vs 右打 (投手やや有利)
  else if (pThrow === 1 && bBat === 2) platoonScore = 45; // 右投 vs 左打 (打者やや有利)
  else if (pThrow === 2 && bBat === 2) platoonScore = 55; // 左投 vs 左打 (投手やや有利)
  else if (pThrow === 2 && bBat === 1) platoonScore = 45; // 左投 vs 右打 (打者やや有利)
  else if (bBat === 3) platoonScore = 48;                 // 両打ち (打者微小有利)
  
  let h2hScore = 50;
  let mockExpectedOutcome = "凡退";

  if (!isNoData) {
    // 基準スコアはOPSで算出
    if (h2hOPS >= 0.900) h2hScore = 20; // 打者圧倒
    else if (h2hOPS >= 0.800) h2hScore = 35; // 打者有利
    else if (h2hOPS >= 0.700) h2hScore = 50; // 互角〜やや打者有利
    else if (h2hOPS >= 0.600) h2hScore = 65; // やや投手有利
    else if (h2hOPS >= 0.400) h2hScore = 80; // 投手有利
    else h2hScore = 90; // 投手圧倒

    // 単発本塁打によるOPSのブレを打率で強力に補正
    if (h2hAvg <= 0.220) {
      h2hScore = Math.max(h2hScore, 75); // 打率が.220以下の場合は決定的に投手有利
    } else if (h2hAvg >= 0.330) {
      h2hScore = Math.min(h2hScore, 25); // 打率が.330以上の場合は決定的に打者有利
    }

    // 三振率 (K%) と本塁打での加減点
    if (h2hAB > 0) {
      const kRate = h2hSO / h2hAB;
      if (kRate >= 0.25) h2hScore += 10; // 三振が多ければ投手の大幅プラス
      if (kRate >= 0.35) h2hScore += 10; // 圧倒的な三振率
    }
    if (h2hHR >= 2) h2hScore -= 10;

    h2hScore = Math.max(5, Math.min(95, h2hScore));
  } else {
    // データなしの場合は平均50
    h2hScore = 50;
  }

  // 総合スコア算出
  let totalScore = 
    (h2hScore * weights.h2h) +
    (platoonScore * weights.platoon) +
    (mock.formScore * weights.form) +
    (mock.pitchScore * weights.pitch) +
    (mock.parkScore * weights.park);

  totalScore = Math.round(Number(totalScore));
  
  // スコア調整 (UIが激しくなりすぎないように少しマイルドに)
  let pitcherAdvPct = totalScore;
  pitcherAdvPct = Math.max(10, Math.min(90, pitcherAdvPct));
  
  const favoredPlayer = pitcherAdvPct >= 55 ? pitcherName : pitcherAdvPct <= 45 ? batterName : '互角';
  
  // 期待結果（有利度と三振の多さに基づくモデル）
  let expectedResult = "凡退";
  const outcomeRnd = seededRandom(hashString(pitcherName + batterName + "outcome"));

  if (pitcherAdvPct >= 65) {
    // 投手圧倒的有利
    expectedResult = outcomeRnd > 0.4 ? "三振" : "凡退";
  } else if (pitcherAdvPct >= 55) {
    // 投手有利
    expectedResult = outcomeRnd > 0.7 ? "三振" : "凡退";
  } else if (pitcherAdvPct <= 35) {
    // 打者圧倒的有利
    expectedResult = outcomeRnd > 0.6 ? "長打" : (outcomeRnd > 0.2 ? "本塁打" : "安打");
  } else if (pitcherAdvPct <= 45) {
    // 打者有利
    expectedResult = outcomeRnd > 0.7 ? "長打" : (outcomeRnd > 0.3 ? "安打" : "四球");
  } else {
    // 互角
    if (outcomeRnd > 0.8) expectedResult = "三振";
    else if (outcomeRnd > 0.7) expectedResult = "長打";
    else if (outcomeRnd > 0.5) expectedResult = "安打";
    else if (outcomeRnd > 0.35) expectedResult = "四球";
    else expectedResult = "凡退";
  }

  return {
    pitcherAdvPercentage: pitcherAdvPct,
    favoredPlayer: favoredPlayer,
    expectedResult: expectedResult
  };
}
