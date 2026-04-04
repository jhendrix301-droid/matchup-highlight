import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Radio, TrendingUp, Database } from 'lucide-react';
import GameCard from './components/GameCard';
import StandingsPanel from './components/StandingsPanel';
import StatsRankings from './components/StatsRankings';
import AudioSummary from './components/AudioSummary';
import './index.css';

const POLL_INTERVAL_MS = 30 * 1000; // 30秒ごとに更新

// 日付文字列を返す (YYYY-MM-DD)
function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// 表示日を決定: 8時前なら昨日をデフォルト、8時以降なら今日
function getDefaultDate() {
  const now = new Date();
  if (now.getHours() < 8) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return formatDate(yesterday);
  }
  return formatDate(now);
}

function getTodayStr() {
  return formatDate(new Date());
}

function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDate(d);
}

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

// 日付ラベル（title と date の2行分を返す）
function getDateLabel(dateStr) {
  const today = getTodayStr();
  const yesterday = getYesterdayStr();
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = WEEKDAY_LABELS[new Date(y, m - 1, d).getDay()];
  const dateText = `${m}/${d}(${dow})`;
  if (dateStr === today)     return { title: '今日の試合', date: dateText };
  if (dateStr === yesterday) return { title: '昨日の試合', date: dateText };
  return { title: dateText, date: '' };
}

// ===== DEV: ダミーデータ（表示確認用） =====
const DUMMY_GAME = {
  gameId: 'dummy-001',
  homeTeam: '巨人',
  awayTeam: 'DeNA',
  homeScore: 2,
  awayScore: 4,
  status: 'live',   // 'pre' | 'live' | 'final' に切り替えて確認
  inning: '7回表',
  homeStartingPitcher: '菅野',
  awayStartingPitcher: '東',
  currentPitcher: '菅野',
  currentBatter: '牧',
  // ホーム（巨人）打線
  lineupHome: [
    { order: 1, pos: '中', name: '丸佳浩',   lastName: '丸',   bat: '左', avg: '.312' },
    { order: 2, pos: '二', name: '吉川尚輝', lastName: '吉川', bat: '左', avg: '.278' },
    { order: 3, pos: '右', name: '岡本和真', lastName: '岡本', bat: '右', avg: '.341' },
    { order: 4, pos: '一', name: '中田翔',   lastName: '中田', bat: '右', avg: '.095' },
    { order: 5, pos: '左', name: 'ウォーカー', lastName: 'ウォーカー', bat: '右', avg: '.288' },
    { order: 6, pos: '捕', name: '大城卓三', lastName: '大城', bat: '右', avg: '.241' },
    { order: 7, pos: '遊', name: '門脇誠',   lastName: '門脇', bat: '右', avg: '.197' },
    { order: 8, pos: '三', name: '坂本勇人', lastName: '坂本', bat: '右', avg: '.156' },
    { order: 9, pos: '投', name: '菅野智之', lastName: '菅野', bat: '右', avg: '-'   },
  ],
  // アウェイ（DeNA）打線
  lineupAway: [
    { order: 1, pos: '遊', name: '林琢真',   lastName: '林',   bat: '右', avg: '.265' },
    { order: 2, pos: '二', name: '牧秀悟',   lastName: '牧',   bat: '右', avg: '.334' },
    { order: 3, pos: '左', name: 'オースティン', lastName: 'オースティン', bat: '右', avg: '.357' },
    { order: 4, pos: '一', name: '宮﨑敏郎', lastName: '宮﨑', bat: '右', avg: '.299' },
    { order: 5, pos: '右', name: '佐野恵太', lastName: '佐野', bat: '左', avg: '.143' },
    { order: 6, pos: '捕', name: '山本祐大', lastName: '山本', bat: '右', avg: '.223' },
    { order: 7, pos: '中', name: '桑原将志', lastName: '桑原', bat: '右', avg: '.188' },
    { order: 8, pos: '三', name: '京田陽太', lastName: '京田', bat: '左', avg: '.072' },
    { order: 9, pos: '投', name: '東克樹',   lastName: '東',   bat: '左', avg: '-'   },
  ],
  // ホーム（巨人）ベンチ
  benchHome: [
    { name: '増田陸',   lastName: '増田', bat: '右', avg: '.321' },
    { name: '北村拓己', lastName: '北村', bat: '左', avg: '.250' },
    { name: '湯浅大',   lastName: '湯浅', bat: '右', avg: '.180' },
    { name: '重信慎之介', lastName: '重信', bat: '左', avg: '.133' },
  ],
  // アウェイ（DeNA）ベンチ
  benchAway: [
    { name: '関根大気', lastName: '関根', bat: '左', avg: '.308' },
    { name: '楠本泰史', lastName: '楠本', bat: '左', avg: '.267' },
    { name: '蝦名達夫', lastName: '蝦名', bat: '右', avg: '.189' },
    { name: 'ソト',     lastName: 'ソト', bat: '右', avg: '.412' },
  ],
};
// ============================================

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export default function App() {
  const [viewDate, setViewDate] = useState(getDefaultDate);
  const [games, setGames] = useState([]);
  const [standings, setStandings] = useState({});
  const [central, setCentral] = useState({});
  const [pacific, setPacific] = useState({});
  const [rankings, setRankings] = useState(null);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [now, setNow] = useState(new Date());

  // 1秒ごとにクロック更新
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // 日付切り替え用
  const today = getTodayStr();
  const yesterday = getYesterdayStr();
  const isViewingToday = viewDate === today;
  const isViewingYesterday = viewDate === yesterday;

  // ========== 全試合データ取得 ==========
  const fetchAllGames = useCallback(async (date) => {
    const targetDate = date || viewDate;
    try {
      // 1. スケジュール + 順位表を並行取得
      const [schedRes, standRes] = await Promise.allSettled([
        fetch(`/api/schedule?date=${targetDate}`).then(r => r.json()),
        fetch('/api/standings').then(r => r.json()),
      ]);

      if (schedRes.status !== 'fulfilled') throw new Error('schedule API error');
      const schedData = schedRes.value;

      if (standRes.status === 'fulfilled' && standRes.value.standings) {
        setStandings(standRes.value.standings);
        setCentral(standRes.value.central || {});
        setPacific(standRes.value.pacific || {});
      }

      const todayGames = schedData.games || [];
      if (todayGames.length === 0) {
        setGames([]);
        setLoading(false);
        return;
      }

      // 2. 各試合の詳細を並行取得（最大6試合）
      const targetGames = todayGames.slice(0, 6);
      const detailResults = await Promise.allSettled(
        targetGames.map(g =>
          fetch(`/api/game-detail?id=${g.gameId}`)
            .then(r => r.json())
            .catch(() => null)
        )
      );

      const enriched = targetGames.map((g, i) => {
        const detail = detailResults[i].status === 'fulfilled' ? detailResults[i].value : null;
        if (!detail) return g;
        const filtered = Object.fromEntries(
          Object.entries(detail).filter(([, v]) => v !== '' && v !== null && v !== undefined)
        );
        return { ...g, ...filtered };
      });

      setGames(enriched);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [viewDate]);

  // 個人成績ランキング取得（初回のみ、5分キャッシュ）
  const fetchRankings = useCallback(async () => {
    setRankingsLoading(true);
    try {
      const res = await fetch('/api/stats-rankings', { cache: 'no-cache' }).then(r => r.json());
      if (res.rankings) setRankings(res.rankings);
    } catch (e) {
      console.warn('rankings fetch failed:', e.message);
    } finally {
      setRankingsLoading(false);
    }
  }, []);

  // 初回 + ポーリング
  useEffect(() => {
    fetchAllGames();
    fetchRankings();
    // 今日の試合を見ている時のみポーリング
    const timer = isViewingToday
      ? setInterval(() => fetchAllGames(), POLL_INTERVAL_MS)
      : null;
    const rankTimer = setInterval(fetchRankings, 5 * 60 * 1000);
    return () => { if (timer) clearInterval(timer); clearInterval(rankTimer); };
  }, [fetchAllGames, fetchRankings, viewDate]);

  // 手動更新
  const handleRefresh = () => {
    setLoading(true);
    fetchAllGames();
  };

  // 日付切り替え
  const handleDateSwitch = (date) => {
    if (date === viewDate) return;
    setViewDate(date);
    setGames([]);
    setLoading(true);
  };

  // ticker items from game data
  const tickerItems = games.length > 0
    ? games.flatMap(g => {
        const items = [`${g.awayTeam} vs ${g.homeTeam}`];
        if (g.status === 'live' && g.awayScore != null)
          items.push(`${g.awayTeam} ${g.awayScore} - ${g.homeScore} ${g.homeTeam} [${g.inning || 'LIVE'}]`);
        if (g.awayStartingPitcher || g.homeStartingPitcher)
          items.push(`先発: ${g.awayStartingPitcher || '未定'} / ${g.homeStartingPitcher || '未定'}`);
        return items;
      })
    : ['NPB TODAY', 'MATCHUP ANALYSIS', 'REAL-TIME DATA', 'PITCHER VS BATTER'];

  const liveCount  = games.filter(g => g.status === 'live').length;
  const preCount   = games.filter(g => g.status === 'pre').length;
  const finalCount = games.filter(g => g.status === 'final').length;

  return (
    <div className="v2-app">
      {/* 光の玉（コメット） */}
      <div className="v2-orb v2-orb--1" aria-hidden="true" />
      <div className="v2-orb v2-orb--2" aria-hidden="true" />
      <div className="v2-orb v2-orb--3" aria-hidden="true" />
      <div className="v2-orb v2-orb--4" aria-hidden="true" />
      <div className="v2-orb v2-orb--5" aria-hidden="true" />
      <div className="v2-orb v2-orb--6" aria-hidden="true" />
      <div className="v2-orb v2-orb--7" aria-hidden="true" />
      <div className="v2-orb v2-orb--8" aria-hidden="true" />
      <div className="v2-orb v2-orb--9" aria-hidden="true" />
      <div className="v2-orb v2-orb--10" aria-hidden="true" />
      <div className="v2-orb v2-orb--11" aria-hidden="true" />
      <div className="v2-orb v2-orb--12" aria-hidden="true" />
      {/* ヘッダー */}
      <header className="v2-header">
        <div className="v2-header-inner">
          <div className="v2-logo">
            <span className="v2-logo-main">MATCHUP HIGH</span>
            <span className="v2-logo-version">V2</span>
          </div>
          <div className="v2-header-right">
            {/* live game count */}
            {liveCount > 0 && (
              <span className="v2-live-count">
                <span className="v2-live-count-dot" />
                LIVE {liveCount}
              </span>
            )}
            {/* リアルタイムクロック */}
            <div className="v2-clock">
              <div className="v2-clock-date">
                {now.getMonth() + 1}/{now.getDate()}({WEEKDAYS[now.getDay()]})
              </div>
              <div className="v2-clock-time">
                {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}:{String(now.getSeconds()).padStart(2, '0')}
              </div>
            </div>
            <button
              className="v2-refresh-btn"
              onClick={handleRefresh}
              disabled={loading}
              title="今すぐ更新"
            >
              <motion.div
                animate={loading ? { rotate: 360 } : { rotate: 0 }}
                transition={loading ? { repeat: Infinity, duration: 0.8, ease: 'linear' } : {}}
              >
                <RefreshCw size={20} />
              </motion.div>
            </button>
          </div>
        </div>
        <div className="v2-header-subtitle">
          <Database size={9} style={{marginRight:'0.3rem',verticalAlign:'middle'}} />
          NPB {isViewingToday ? 'REAL-TIME' : 'RESULTS'} &nbsp;|&nbsp; {games.length} GAMES
          {liveCount  > 0 && <> &nbsp;|&nbsp; <span style={{color:'#ef4444'}}>● LIVE {liveCount}</span></>}
          {preCount   > 0 && <> &nbsp;|&nbsp; <span style={{color:'#f59e0b'}}>PRE {preCount}</span></>}
          {finalCount > 0 && <> &nbsp;|&nbsp; <span style={{color:'#64748b'}}>FINAL {finalCount}</span></>}
        </div>
      </header>

      {/* Ticker strip */}
      {games.length > 0 && (
        <div className="v2-ticker" aria-hidden="true">
          <div className="v2-ticker-inner">
            {[...tickerItems, ...tickerItems].map((item, i) => (
              <span key={i} className="v2-ticker-item">
                <TrendingUp size={9} style={{flexShrink:0}} />
                {item}
                <span className="v2-ticker-sep">◆</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 日付切り替え + 音声サマリー（横並び） */}
      <div className="v2-controls-bar">
        <div className="v2-date-toggle">
          {[yesterday, today].map((dateStr) => {
            const isActive = viewDate === dateStr;
            const { title, date } = getDateLabel(dateStr);
            return (
              <button
                key={dateStr}
                className={`v2-date-btn ${isActive ? 'v2-date-btn--active' : ''}`}
                onClick={() => handleDateSwitch(dateStr)}
              >
                <span className="v2-date-btn-title">{title}</span>
                {date && <span className="v2-date-btn-date">{date}</span>}
              </button>
            );
          })}
        </div>
        <AudioSummary games={games} />
      </div>

      {/* メインコンテンツ */}
      <main className="v2-main">
        {/* ローディング */}
        {loading && games.length === 0 && (
          <div className="v2-loading">
            INITIALIZING DATA FEED...
          </div>
        )}

        {/* エラー */}
        {error && (
          <div className="v2-error">
            <p>データの取得に失敗しました</p>
            <p className="v2-error-detail">{error}</p>
            <button className="v2-retry-btn" onClick={handleRefresh}>RETRY</button>
          </div>
        )}

        {/* 試合なし */}
        {!loading && !error && games.length === 0 && (
          <div className="v2-no-games">
            <p>本日は試合がありません</p>
          </div>
        )}

        {/* 試合カードグリッド */}
        <AnimatePresence>
          {games.length > 0 && (
            <motion.div
              className="v2-games-grid"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.07 } }
              }}
            >
              {games.map((game, i) => (
                <motion.div
                  key={game.gameId || i}
                  style={{ height: '100%' }}
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } }
                  }}
                >
                  <GameCard game={game} standings={standings} forceFinal={!isViewingToday} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ポーリング表示 */}
        {games.length > 0 && (
          <div className="v2-poll-notice">
            <Radio size={9} style={{marginRight:'0.3rem',verticalAlign:'middle'}} />
            AUTO-REFRESH 30s &nbsp;|&nbsp; {games.length} FEEDS ACTIVE
          </div>
        )}

        {/* 順位表 */}
        <div className="v2-standings-area">
          <StandingsPanel central={central} pacific={pacific} />
        </div>

        {/* 個人成績ランキング */}
        <StatsRankings rankings={rankings} loading={rankingsLoading} />
      </main>
    </div>
  );
}
