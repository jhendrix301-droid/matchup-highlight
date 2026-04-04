import React, { useState } from 'react';

// 略称 → フルネーム変換マップ
const TEAM_FULL = {
  'オ': 'オリックス', 'ソ': 'ソフトバンク', '楽': '楽天', '日': '日本ハム',
  'デ': 'DeNA', 'ロ': 'ロッテ', '西': '西武',
  '巨': '巨人', '神': '阪神', '広': '広島', 'ヤ': 'ヤクルト', '中': '中日',
};
function teamFull(abbr) { return TEAM_FULL[abbr] || abbr; }

const BATTER_CATS = [
  { key: 'avg',  label: '打率',   fmt: v => v.toFixed(3), unit: '' },
  { key: 'hr',   label: 'HR',     fmt: v => v, unit: '本' },
  { key: 'rbi',  label: '打点',   fmt: v => v, unit: '' },
  { key: 'hits', label: '安打',   fmt: v => v, unit: '' },
  { key: 'sb',   label: '盗塁',   fmt: v => v, unit: '' },
];

const PITCHER_CATS = [
  { key: 'era',  label: '防御率', fmt: v => v.toFixed(2), unit: '', asc: true },
  { key: 'wins', label: '勝利',   fmt: v => v, unit: '勝' },
  { key: 'sv',   label: 'セーブ', fmt: v => v, unit: '' },
  { key: 'hold', label: 'H/P',    fmt: v => v, unit: '' },
  { key: 'so',   label: '奪三振', fmt: v => v, unit: '' },
];

function RankList({ players, category }) {
  if (!players || players.length === 0) {
    return <div className="sr-empty">データなし</div>;
  }
  const best = players[0][category.key];
  return (
    <div className="sr-list">
      {players.map((p, i) => {
        const val = p[category.key];
        const pct = best > 0 ? (category.asc ? (best / val) * 100 : (val / best) * 100) : 50;
        return (
          <div key={i} className="sr-item">
            <span className="sr-rank">{i + 1}</span>
            <div className="sr-player">
              {p.jersey && <span className="sr-jersey">#{p.jersey}</span>}
              <span className="sr-name">{p.name}</span>
              <span className="sr-team">{teamFull(p.team)}</span>
            </div>
            <div className="sr-bar-wrap">
              <div className="sr-bar-track">
                <div className="sr-bar-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            </div>
            <span className="sr-val">{category.fmt(val)}{category.unit}</span>
          </div>
        );
      })}
    </div>
  );
}

function CatTabs({ cats, active, onSelect }) {
  return (
    <div className="sr-tabs">
      {cats.map(c => (
        <button
          key={c.key}
          className={`sr-tab ${active === c.key ? 'sr-tab--active' : ''}`}
          onClick={() => onSelect(c.key)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

function LeagueToggle({ league, onSelect }) {
  return (
    <div className="sr-league-toggle">
      <button
        className={`sr-league-btn ${league === 'central' ? 'sr-league-btn--active sr-league-btn--ce' : ''}`}
        onClick={() => onSelect('central')}
      >
        セ・リーグ
      </button>
      <button
        className={`sr-league-btn ${league === 'pacific' ? 'sr-league-btn--active sr-league-btn--pa' : ''}`}
        onClick={() => onSelect('pacific')}
      >
        パ・リーグ
      </button>
    </div>
  );
}

export default function StatsRankings({ rankings, loading }) {
  const [batterCat, setBatterCat] = useState('avg');
  const [pitcherCat, setPitcherCat] = useState('era');
  const [batLeague, setBatLeague] = useState('central');
  const [pitLeague, setPitLeague] = useState('central');

  // データ構造: rankings.batting.avg = { central: [...], pacific: [...] }
  const getBatters = () => {
    const data = rankings?.batting?.[batterCat];
    if (!data) return [];
    // 新形式（リーグ別）
    if (data.central || data.pacific) return data[batLeague] || [];
    // 旧形式（配列）フォールバック
    return data;
  };

  const getPitchers = () => {
    const data = rankings?.pitching?.[pitcherCat];
    if (!data) return [];
    if (data.central || data.pacific) return data[pitLeague] || [];
    return data;
  };

  return (
    <div className="sr-wrap">
      <div className="sp-section-header">
        <span className="sp-toggle-dot" style={{ background: '#f59e0b' }} />
        STAT LEADERS
      </div>
      <div className="sr-body">
        {loading ? (
          <div className="sr-loading">LOADING DATA...</div>
        ) : !rankings ? (
          <div className="sr-loading">データなし</div>
        ) : (
          <div className="sr-panels">
            <div className="sr-panel">
              <div className="sr-panel-header sr-panel-header--bat">BATTING</div>
              <LeagueToggle league={batLeague} onSelect={setBatLeague} />
              <CatTabs cats={BATTER_CATS} active={batterCat} onSelect={setBatterCat} />
              <RankList
                players={getBatters()}
                category={BATTER_CATS.find(c => c.key === batterCat)}
              />
            </div>
            <div className="sr-panel">
              <div className="sr-panel-header sr-panel-header--pit">PITCHING</div>
              <LeagueToggle league={pitLeague} onSelect={setPitLeague} />
              <CatTabs cats={PITCHER_CATS} active={pitcherCat} onSelect={setPitcherCat} />
              <RankList
                players={getPitchers()}
                category={PITCHER_CATS.find(c => c.key === pitcherCat)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
