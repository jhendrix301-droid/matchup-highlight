import React, { useState, useRef, useCallback, useEffect } from 'react';

// ===== テクノBGM生成（Web Audio API） =====
function createTechnoBGM(audioCtx) {
  const masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.10;
  masterGain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;
  const BPM = 128;
  const beat = 60 / BPM;
  const totalBeats = 240; // ~112秒分

  // === キック（4つ打ち） ===
  for (let i = 0; i < totalBeats; i++) {
    const t = now + i * beat;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  // === ハイハット（8分音符） ===
  for (let i = 0; i < totalBeats * 2; i++) {
    const t = now + i * (beat / 2);
    // ノイズの代替: 超高周波オシレータ
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    osc.type = 'square';
    osc.frequency.value = 6000 + Math.random() * 4000;
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    const accent = i % 2 === 0 ? 0.08 : 0.04;
    gain.gain.setValueAtTime(accent, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  // === ベースライン（シンセベース） ===
  const bassNotes = [55, 55, 65.4, 73.4]; // Am ベースライン
  const bassPattern = bassNotes.length;
  for (let i = 0; i < totalBeats; i++) {
    const t = now + i * beat;
    const note = bassNotes[Math.floor(i / 4) % bassPattern];
    // 16分音符のパルス感
    if (i % 2 === 0) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      osc.type = 'sawtooth';
      osc.frequency.value = note;
      filter.type = 'lowpass';
      filter.frequency.value = 300;
      filter.Q.value = 8;
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.setValueAtTime(0.25, t + beat * 0.7);
      gain.gain.linearRampToValueAtTime(0.0, t + beat * 0.95);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + beat);
    }
  }

  // === パッドコード（浮遊感） ===
  const padChords = [
    [220, 261.6, 329.6],   // Am
    [196, 246.9, 329.6],   // G/E
    [174.6, 220, 293.7],   // F
    [196, 246.9, 329.6],   // G
  ];
  const chordDuration = beat * 8; // 2小節ごと
  for (let ci = 0; ci < Math.ceil(totalBeats / 8); ci++) {
    const chord = padChords[ci % padChords.length];
    const t = now + ci * chordDuration;
    chord.forEach(freq => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * 2; // 1オクターブ上
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 1.0);
      gain.gain.setValueAtTime(0.08, t + chordDuration - 1.0);
      gain.gain.linearRampToValueAtTime(0, t + chordDuration);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + chordDuration + 0.1);
    });
  }

  // === アルペジオ（テクノ感強化） ===
  const arpNotes = [329.6, 440, 523.3, 440, 659.3, 523.3, 440, 329.6];
  for (let i = 0; i < totalBeats * 2; i++) {
    const t = now + i * (beat / 2);
    const note = arpNotes[i % arpNotes.length];
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = note;
    gain.gain.setValueAtTime(0.03, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.4);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + beat * 0.45);
  }

  return { masterGain };
}

// ===== ラジオDJ風ナレーションスクリプト生成 =====
function generateScript(games, recaps) {
  const finalGames = games.filter(g => g.status === 'final');
  const liveGames = games.filter(g => g.status === 'live');

  if (finalGames.length === 0 && liveGames.length === 0) {
    return 'ヘイ！NPB トゥデイ！今日は試合情報がないぜ。また明日チェックしてくれ！';
  }

  const lines = [];
  lines.push('Yo！チェケラ！こちらNPB TODAY！');
  lines.push(`本日の全${finalGames.length + liveGames.length}試合、一気にいくぜ！`);

  // 終了した試合
  finalGames.forEach((g, idx) => {
    const winner = g.homeScore > g.awayScore ? g.homeTeam : g.awayTeam;
    const loser = g.homeScore > g.awayScore ? g.awayTeam : g.homeTeam;
    const winScore = Math.max(g.homeScore, g.awayScore);
    const loseScore = Math.min(g.homeScore, g.awayScore);
    const diff = winScore - loseScore;

    // DJ風イントロ
    const intros = ['まずは！', 'お次！', '続いて！', 'さぁ次！', 'ラストはこちら！', 'そして！'];
    const intro = intros[idx % intros.length];

    let line = `${intro}${g.awayTeam} 対 ${g.homeTeam}！`;

    if (diff >= 5) {
      line += `${winScore}対${loseScore}、${winner}の圧勝！やばいね！`;
    } else if (diff === 1) {
      line += `${winScore}対${loseScore}、${winner}が接戦を制した！しびれる一戦！`;
    } else {
      line += `${winScore}対${loseScore}で${winner}の勝利！`;
    }

    // 戦評
    const recap = recaps[g.gameId];
    if (recap) {
      const short = recap.length > 60 ? recap.substring(0, 60) + '。' : recap;
      line += short;
    }

    lines.push(line);
  });

  // 試合中
  if (liveGames.length > 0) {
    lines.push('そしてまだ熱い戦いが続いてるぜ！');
    liveGames.forEach(g => {
      const leading = (g.awayScore ?? 0) > (g.homeScore ?? 0) ? g.awayTeam
        : (g.homeScore ?? 0) > (g.awayScore ?? 0) ? g.homeTeam : null;
      let line = `${g.awayTeam} 対 ${g.homeTeam}、${g.inning || '試合中'}！`;
      line += `${g.awayScore ?? 0}対${g.homeScore ?? 0}、`;
      line += leading ? `${leading}リード！` : '同点の緊迫した展開！';
      lines.push(line);
    });
  }

  lines.push('以上！本日のNPBダイジェスト！また明日もチェックよろしく！ピース！');

  return lines.join('　');
}

export default function AudioSummary({ games }) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recaps, setRecaps] = useState({});
  const [progress, setProgress] = useState(0);
  const audioCtxRef = useRef(null);
  const intervalRef = useRef(null);
  const utteranceRef = useRef(null);

  const finalGames = games.filter(g => g.status === 'final');
  const liveGames = games.filter(g => g.status === 'live');
  const hasContent = finalGames.length > 0 || liveGames.length > 0;

  // 戦評を取得
  const fetchRecaps = useCallback(async () => {
    const finals = games.filter(g => g.status === 'final' && g.gameId);
    if (finals.length === 0) return {};

    const results = {};
    await Promise.allSettled(
      finals.map(async g => {
        try {
          const res = await fetch(`/api/game-stats?id=${g.gameId}`);
          const data = await res.json();
          if (data.recap) results[g.gameId] = data.recap;
        } catch {}
      })
    );
    return results;
  }, [games]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch {}
      }
    };
  }, []);

  const handleStop = useCallback(() => {
    window.speechSynthesis.cancel();
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPlaying(false);
    setProgress(0);
  }, []);

  const handlePlay = useCallback(async () => {
    if (playing) {
      handleStop();
      return;
    }

    setLoading(true);

    // 戦評取得
    let fetchedRecaps = recaps;
    if (Object.keys(recaps).length === 0) {
      fetchedRecaps = await fetchRecaps();
      setRecaps(fetchedRecaps);
    }

    const script = generateScript(games, fetchedRecaps);

    // SpeechSynthesis
    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(script);
    utterance.lang = 'ja-JP';
    utterance.rate = 1.2;   // テンポよく
    utterance.pitch = 1.15; // やや高めでエネルギッシュ
    utterance.volume = 1.0;

    // DJ風: 男性ボイス優先（Otoya / Hattori）
    const voices = synth.getVoices();
    const jaVoice =
      voices.find(v => v.lang.startsWith('ja') && v.name.includes('Otoya'))
      || voices.find(v => v.lang.startsWith('ja') && v.name.includes('Hattori'))
      || voices.find(v => v.lang.startsWith('ja') && v.name.includes('O-Ren'))
      || voices.find(v => v.lang.startsWith('ja'));
    if (jaVoice) utterance.voice = jaVoice;

    utteranceRef.current = utterance;

    // テクノBGM開始
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = audioCtx;
    createTechnoBGM(audioCtx);

    // プログレスバー
    const estimatedDuration = script.length * 0.11;
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const pct = Math.min((elapsed / estimatedDuration) * 100, 98);
      setProgress(pct);
    }, 200);

    utterance.onend = () => {
      setProgress(100);
      setTimeout(() => {
        handleStop();
      }, 1000);
    };

    utterance.onerror = () => {
      handleStop();
    };

    setPlaying(true);
    setLoading(false);
    synth.speak(utterance);
  }, [playing, games, recaps, fetchRecaps, handleStop]);

  if (!hasContent) return null;

  return (
    <div className="audio-summary">
      <button
        className={`audio-summary-btn ${playing ? 'audio-summary-btn--playing' : ''}`}
        onClick={handlePlay}
        disabled={loading}
      >
        <span className="audio-summary-icon">
          {loading ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
              </circle>
            </svg>
          ) : playing ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1"/>
              <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
          )}
        </span>
        <span className="audio-summary-label">
          {loading ? 'LOADING...' : playing ? 'STOP' : '今日のプロ野球全試合を1分で振り返りッスン！'}
        </span>
        {playing && (
          <span className="audio-summary-eq">
            <span className="eq-bar eq-bar-1"/>
            <span className="eq-bar eq-bar-2"/>
            <span className="eq-bar eq-bar-3"/>
            <span className="eq-bar eq-bar-4"/>
            <span className="eq-bar eq-bar-5"/>
          </span>
        )}
      </button>
      {playing && (
        <div className="audio-summary-progress">
          <div className="audio-summary-progress-fill" style={{ width: `${progress}%` }}/>
        </div>
      )}
    </div>
  );
}
