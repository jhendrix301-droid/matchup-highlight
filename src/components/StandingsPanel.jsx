import React from 'react';

function LeagueTable({ name, data, color }) {
  const teams = Object.entries(data)
    .map(([team, d]) => ({ team, ...d }))
    .sort((a, b) => a.rank - b.rank);

  if (teams.length === 0) return null;

  return (
    <div className="sp-league">
      <div className="sp-league-title" style={{ color }}>
        {name}
      </div>
      <table className="sp-table">
        <thead>
          <tr className="sp-thead-row">
            <th className="sp-th sp-th--rank"></th>
            <th className="sp-th sp-th--team"></th>
            <th className="sp-th sp-th--num">勝</th>
            <th className="sp-th sp-th--num">敗</th>
            <th className="sp-th sp-th--num">分</th>
            <th className="sp-th sp-th--pct">勝率</th>
            <th className="sp-th sp-th--gb">差</th>
            <th className="sp-th sp-th--wide">打</th>
            <th className="sp-th sp-th--wide">防</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t, i) => (
            <tr key={t.team} className={`sp-row ${i === 0 ? 'sp-row--first' : ''}`}>
              <td className="sp-td sp-rank">{t.rank}</td>
              <td className="sp-td sp-team">{t.team}</td>
              <td className="sp-td sp-num">{t.wins}</td>
              <td className="sp-td sp-num">{t.losses}</td>
              <td className="sp-td sp-num">{t.draws}</td>
              <td className="sp-td sp-pct" style={{ color: color }}>{t.pct}</td>
              <td className="sp-td sp-gb">{t.gb === '-' || !t.gb ? '-' : t.gb}</td>
              <td className="sp-td sp-num sp-num--wide">{t.avg}</td>
              <td className="sp-td sp-num sp-num--wide">{t.era}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StandingsPanel({ central = {}, pacific = {} }) {
  const hasCentral = Object.keys(central).length > 0;
  const hasPacific = Object.keys(pacific).length > 0;
  if (!hasCentral && !hasPacific) return null;

  return (
    <div className="sp-wrap">
      <div className="sp-section-header">
        <span className="sp-toggle-dot" />
        STANDINGS
      </div>
      <div className="sp-body">
        <div className="sp-leagues">
          <LeagueTable name="セ・リーグ" data={central} color="#3b82f6" />
          <LeagueTable name="パ・リーグ" data={pacific} color="#f59e0b" />
        </div>
      </div>
    </div>
  );
}
