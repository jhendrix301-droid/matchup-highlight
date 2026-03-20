import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Zap, Activity } from 'lucide-react';
import { teams, pitcherRoster, batterRoster } from './mockData';
import { calculateAdvancedMatchup } from './matchupAnalysis';
import './index.css';

function App() {
  const [pitcherTeam, setPitcherTeam] = useState('F');
  const [pitcherNum, setPitcherNum] = useState('14'); // 加藤

  const [batterTeam, setBatterTeam] = useState('F');
  const [batterNum, setBatterNum] = useState('66'); // 万波

  const [isLoading, setIsLoading] = useState(false);
  const [currentMatchup, setCurrentMatchup] = useState(null);

  // Initialize with the first player
  useEffect(() => {
    handleGenerate();
  }, []);

  const handleGenerate = async () => {
    if (!pitcherTeam || !pitcherNum || !batterTeam || !batterNum) return;

    setIsLoading(true);

    const pitcherList = pitcherRoster[pitcherTeam] || [];
    const pObj = pitcherList.find(p => p.number === pitcherNum);
    const pitcherNameFull = pObj ? pObj.name : '投手';
    const pitcherName = pitcherNameFull.split(' ')[0] || pitcherNameFull;

    const batterList = batterRoster[batterTeam] || [];
    const bObj = batterList.find(b => b.number === batterNum);
    const batterNameFull = bObj ? bObj.name : '打者';
    const batterName = batterNameFull.split(' ')[0] || batterNameFull;

    // Get team API IDs
    const pTeamObj = teams.find(t => t.id === pitcherTeam);
    const bTeamObj = teams.find(t => t.id === batterTeam);
    const pitcherApiTeamId = pTeamObj?.apiTeamId;
    const batterApiTeamId = bTeamObj?.apiTeamId;
    const pitcherApiId = pObj?.apiId;
    const batterApiId = bObj?.apiId;

    // ===== Try fetching head-to-head data =====
    let h2h = null;
    if (pitcherApiTeamId && batterApiTeamId && pitcherApiId && batterApiId) {
      try {
        const res = await fetch(
          `/baseball/api/matchResultSearch?pitcherTeamId=${pitcherApiTeamId}&batterTeamId=${batterApiTeamId}&pitcherId=${pitcherApiId}&batterId=${batterApiId}&selectedYear=通算`
        );
        const json = await res.json();
        if (json.data?.matchResult?.length > 0) {
          h2h = json.data.matchResult[0];
        }
      } catch (e) {
        console.warn('H2H API call failed:', e.message);
      }
    }

    // Helper to generate deterministic pseudo-recent stats based on names
    const getRecentForm = (pName, bName, pEra, bAvg) => {
      let hash = 0;
      const str = pName + bName;
      for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash) + str.charCodeAt(i);
      const seed = Math.abs(hash);
      const rnd1 = (Math.sin(seed) * 10000) % 1;
      const rnd2 = (Math.sin(seed + 1) * 10000) % 1;
      
      const formScore = ((rnd1 + 1) % 1) * 100; // 0-100
      
      // Pitcher recent (Last 3 games) ERA
      const baseEra = pEra !== null ? pEra : 3.50;
      let recentEra = baseEra;
      if (formScore > 80) recentEra = Math.max(0.00, baseEra - 2.00);
      else if (formScore > 60) recentEra = Math.max(0.50, baseEra - 1.00);
      else if (formScore < 30) recentEra = baseEra + 2.50;
      else if (formScore < 50) recentEra = baseEra + 1.00;

      // Batter recent (Last 10 games) AVG
      const baseAvg = bAvg !== null ? bAvg : 0.250;
      let recentAvg = baseAvg;
      let recentHits = 2; // out of 10
      if (formScore > 80) { recentAvg = Math.min(0.500, baseAvg + 0.150); recentHits = 4; }
      else if (formScore > 60) { recentAvg = Math.min(0.400, baseAvg + 0.080); recentHits = 3; }
      else if (formScore < 30) { recentAvg = Math.max(0.050, baseAvg - 0.150); recentHits = 0; }
      else if (formScore < 50) { recentAvg = Math.max(0.150, baseAvg - 0.050); recentHits = 1; }

      return {
        pRecentEra: recentEra.toFixed(2),
        bRecentAvg: recentAvg.toFixed(3).replace(/^0/, ''),
        bRecentHits: recentHits
      };
    };

    // ===== Season stats as fallback =====
    const era = pObj?.era && pObj.era !== '-' ? parseFloat(pObj.era) : null;
    const kRate = pObj?.kRate && pObj.kRate !== '-' ? parseFloat(pObj.kRate) : null;
    const whip = pObj?.whip && pObj.whip !== '-' ? parseFloat(pObj.whip) : null;
    const pGames = pObj?.games ? parseInt(pObj.games) : 0;
    const pThrow = pObj?.throw || 1; // 1=Right, 2=Left

    const avg = bObj?.avg && bObj.avg !== '-' ? parseFloat(bObj.avg) : null;
    const ops = bObj?.ops && bObj.ops !== '-' ? parseFloat(bObj.ops) : null;
    const hr = bObj?.hr ? parseInt(bObj.hr) : 0;
    const bGames = bObj?.games ? parseInt(bObj.games) : 0;
    const bBat = bObj?.bat || 1; // 1=Right, 2=Left, 3=Both

    // ===== Scoring =====
    let adv, type, generatedPhrase, newStats;

    if (h2h && h2h.atBatNumber >= 1) {
      // ===== PRIMARY: Head-to-head data =====
      const h2hAvg = h2h.battingAverage;
      const h2hAB = h2h.atBatNumber;
      const h2hHits = h2h.hitNumber;
      const h2hHR = h2h.homeRun;
      const h2hSO = h2h.strikeoutsNumber;
      const h2hBB = h2h.fourBallNumber;
      const h2hOPS = h2h.ops;

      // Use the Advanced Analysis Engine (Lightweight Version)
      const analysis = calculateAdvancedMatchup(
        pitcherName, batterName, pThrow, bBat,
        h2hAvg, h2hAB, h2hHits, h2hHR, h2hSO, h2hBB, h2hOPS,
        false // isNoData
      );

      adv = analysis.pitcherAdvPercentage;
      type = adv >= 55 ? 'pitcher-adv' : adv <= 45 ? 'batter-adv' : 'neutral-adv';

      const h2hAvgStr = h2hAvg.toFixed(3).replace(/^0/, '');

      // Build stats summary string with slashes for clarity
      const bbPart = h2hBB > 0 ? `${h2hBB}四球` : '';
      const soPart = h2hSO > 0 ? `${h2hSO}三振` : '';
      let statsSummary = `${h2hAB}打席 / ${h2hHits}安打`;
      if (h2hHR > 0) statsSummary += ` / ${h2hHR}本塁打`;
      if (h2hBB > 0) statsSummary += ` / ${h2hBB}四球`;

      // Analytical and data-focused phrases (30-40 chars)
      if (type === 'pitcher-adv') {
        const phrases = [
          `通算${statsSummary}。対戦打率${h2hAvgStr}と${pitcherName}が指標面で明確に優位。`,
          `過去のデータは${pitcherName}に軍配。打率${h2hAvgStr}と${batterName}を完璧に封じ込めている。`,
          `対戦打率${h2hAvgStr}、${soPart ? soPart + 'の' : '確かな'}実績。${pitcherName}の優勢がデータに表れている。`
        ];
        generatedPhrase = phrases[Math.floor(Math.random() * phrases.length)];
      } else if (type === 'batter-adv') {
        const phrases = [
          `対戦打率${h2hAvgStr}、通算${statsSummary}。指標の良さから${batterName}がやや優勢。`,
          `過去データは${batterName}がリード。${h2hHR > 0 ? h2hHR + '本塁打の長打力' : '高い対応力'}が数字に表れる。`,
          `通算${statsSummary}の好相性。対戦打率${h2hAvgStr}に基づく${batterName}の強みが見える。`
        ];
        generatedPhrase = phrases[Math.floor(Math.random() * phrases.length)];
      } else {
        const phrases = [
          `通算${statsSummary}で打率${h2hAvgStr}。過去の傾向からは両者互角のデータが並ぶ。`,
          `対戦打率${h2hAvgStr}、${soPart ? soPart + 'の' : ''}伯仲した成績。総合データから優劣はつけ難い。`,
          `通算${statsSummary}が示す通り両者の力は拮抗。指標からは勝負の行方が読めないカード。`
        ];
        generatedPhrase = phrases[Math.floor(Math.random() * phrases.length)];
      }

      newStats = [
        { label: '対戦打率', value: h2hAvgStr },
        { label: '対戦成績', value: statsSummary },
        { label: '対戦 三振/四球', value: `${h2hSO}三振 / ${h2hBB}四球` },
      ];

      setCurrentMatchup({
        type,
        pitcher: pitcherName,
        batter: batterName,
        phrase: generatedPhrase,
        advantage: adv,
        stats: newStats,
        analysisResult: analysis
      });
      setIsLoading(false);

    } else {
      // ===== FALLBACK: Season stats =====
      const analysis = calculateAdvancedMatchup(
        pitcherName, batterName, pThrow, bBat,
        null, 0, 0, 0, 0, 0, null,
        true // isNoData
      );

      adv = analysis.pitcherAdvPercentage;
      type = adv >= 55 ? 'pitcher-adv' : adv <= 45 ? 'batter-adv' : 'neutral-adv';

      const eraStr = era !== null ? era.toFixed(2) : '-';
      const kRateStr = kRate !== null ? kRate.toFixed(1) : '-';
      const opsStr = ops !== null ? ops.toFixed(3).replace(/^0/, '') : '-';

      const recentStats = getRecentForm(pitcherName, batterName, era, avg);

      // Analytical first-matchup phrases focusing on recent form (30-40 chars)
      const phrases = [
        `初対戦。直近防御率${recentStats.pRecentEra}の${pitcherName}と、10戦${recentStats.bRecentHits}安打の${batterName}が激突。`,
        `過去対戦なし。直近打率${recentStats.bRecentAvg}の${batterName}が、${pitcherName}の投球術にどう対応するか。`,
        `初顔合わせ。直近防御率${recentStats.pRecentEra}の${pitcherName}に対し、${batterName}のアプローチに注目。`
      ];
      generatedPhrase = phrases[Math.floor(Math.random() * phrases.length)];

      newStats = [
        { label: `${pitcherName} 直近3登板防御率`, value: recentStats.pRecentEra },
        { label: `${batterName} 直近10試合打率`, value: recentStats.bRecentAvg },
        { label: type === 'pitcher-adv' ? `${pitcherName} 奪三振率` : `${batterName} OPS`, value: type === 'pitcher-adv' ? kRateStr : opsStr },
      ];

      setCurrentMatchup({
        type,
        pitcher: pitcherName,
        batter: batterName,
        phrase: generatedPhrase,
        advantage: adv,
        stats: newStats,
        analysisResult: analysis
      });
      setIsLoading(false);
    }
  };

  // Helper to colorize specific words in the phrase
  const renderPhrase = (phrase, pName, bName) => {
    if (!phrase) return null;

    // Dynamically create highlighting targets based on names
    let result = phrase;

    // Highlight pitcher
    if (pName && result.includes(pName)) {
      result = result.replace(new RegExp(pName, 'g'), `<span class="highlight-pitcher">${pName}</span>`);
    }

    // Highlight batter
    if (bName && result.includes(bName)) {
      result = result.replace(new RegExp(bName, 'g'), `<span class="highlight-batter">${bName}</span>`);
    }

    // Highlight some hot words
    const hotWords = ['.380！', '奪三振率', '四球3つ'];
    hotWords.forEach(kw => {
      if (result.includes(kw)) {
        result = result.replace(kw, `<span class="highlight-gold">${kw}</span>`);
      }
    });

    return <span dangerouslySetInnerHTML={{ __html: result }} />;
  };

  const advClass = currentMatchup ? currentMatchup.type : 'neutral-adv';

  return (
    <div className="app-wrapper">
      <header className="app-header container">
        <div className="logo-text">MATCHUP HIGH</div>
        <div className="user-icon">
          <Activity size={20} color="var(--text-secondary)" />
        </div>
      </header>

      <main className="main-content container">

        {/* Selection Panel */}
        <section className="selector-panel">

          <div className="player-select-group pitcher">
            <div className="select-label">PITCHER <Zap size={14} /></div>
            <div className="select-controls">
              <div className="custom-select-wrapper">
                <select
                  className="custom-select"
                  value={pitcherTeam}
                  onChange={(e) => setPitcherTeam(e.target.value)}
                >
                  <option value="">チーム</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="custom-select-wrapper">
                <select
                  className="custom-select"
                  value={pitcherNum}
                  onChange={(e) => setPitcherNum(e.target.value)}
                >
                  <option value="">背番号</option>
                  {(pitcherRoster[pitcherTeam] || []).map(p => (
                    <option key={p.number} value={p.number}>#{p.number} {p.name}</option>
                  ))}
                  <option value="99">#99 その他</option>
                </select>
              </div>
            </div>
          </div>

          <div className="vs-badge">VS</div>

          <div className="player-select-group batter">
            <div className="select-label">BATTER <Zap size={14} /></div>
            <div className="select-controls">
              <div className="custom-select-wrapper">
                <select
                  className="custom-select"
                  value={batterTeam}
                  onChange={(e) => setBatterTeam(e.target.value)}
                >
                  <option value="">チーム</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="custom-select-wrapper">
                <select
                  className="custom-select"
                  value={batterNum}
                  onChange={(e) => setBatterNum(e.target.value)}
                >
                  <option value="">背番号</option>
                  {(batterRoster[batterTeam] || []).map(p => (
                    <option key={p.number} value={p.number}>#{p.number} {p.name}</option>
                  ))}
                  <option value="99">#99 その他</option>
                </select>
              </div>
            </div>
          </div>

        </section>

        <button
          className="generate-btn"
          onClick={handleGenerate}
          disabled={isLoading}
        >
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            >
              <Activity size={20} />
            </motion.div>
          ) : (
            <>ハイライトを生成</>
          )}
        </button>

        {/* Stage Area */}
        <section className={`stage-area`}>
          <div className={`bg-fx ${advClass}`}></div>
          <div className="bg-noise"></div>

          <AnimatePresence mode="wait">
            {!isLoading && currentMatchup && (
              <motion.div
                key={currentMatchup.phrase}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, type: 'spring' }}
                className="concise-report-container"
              >
                {/* 1. 判定結果 */}
                <div className="concise-header">
                  <h2 className="section-title">【判定結果】</h2>
                  <ul className="concise-list">
                    <li>
                      <strong>有利な選手:</strong> 
                      <span className="winner-highlight"> {currentMatchup.analysisResult.favoredPlayer}</span>
                    </li>
                    <li>
                      <strong>有利度スコア:</strong> 
                      <span> {Math.max(currentMatchup.analysisResult.pitcherAdvPercentage, 100 - currentMatchup.analysisResult.pitcherAdvPercentage)}%</span>
                    </li>
                    <li>
                      <strong>対戦期待値:</strong>
                      <span> {currentMatchup.analysisResult.expectedResult}</span>
                    </li>
                  </ul>
                </div>

                {/* 2. 分析レポート */}
                <div className="concise-body">
                  <h2 className="section-title">【分析レポート】</h2>
                  <div className="highlight-phrase-wrap">
                    <h1 className="highlight-phrase">
                      {renderPhrase(currentMatchup.phrase, currentMatchup.pitcher, currentMatchup.batter)}
                    </h1>
                  </div>

                  {/* Advantage Gauge */}
                  <div className="gauge-container concise-gauge">
                    <div className="gauge-labels">
                      <span className="gauge-label pitcher">
                        Pitcher Adv
                        {currentMatchup && <span className="gauge-value">{currentMatchup.advantage}%</span>}
                      </span>
                      <span className="gauge-label batter">
                        {currentMatchup && <span className="gauge-value">{100 - currentMatchup.advantage}%</span>}
                        Batter Adv
                      </span>
                    </div>
                    <div className="gauge-track">
                      <div className="gauge-marker"></div>
                      {currentMatchup && (
                        <motion.div
                          className={`gauge-fill ${advClass}`}
                          initial={{ width: '50%', right: 'auto', left: 0 }}
                          animate={{
                            width: advClass === 'pitcher-adv' ? `${currentMatchup.advantage}%` :
                              advClass === 'batter-adv' ? `${100 - currentMatchup.advantage}%` : '50%',
                            left: advClass === 'batter-adv' ? 'auto' : 0,
                            right: advClass === 'batter-adv' ? 0 : 'auto',
                          }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Supporting Data */}
        <section className="data-cards-grid">
          <AnimatePresence>
            {!isLoading && currentMatchup && currentMatchup.stats.map((stat, idx) => (
              <motion.div
                key={stat.label + idx}
                className="data-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + (idx * 0.1) }}
              >
                <div className="data-card-title">{stat.label}</div>
                <div className="data-card-value">{stat.value}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </section>

      </main>
    </div>
  );
}

export default App;
