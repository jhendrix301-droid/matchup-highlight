// 前シーズン NPB 先発投手成績（参考データ）
// wins: 勝, losses: 敗, era: 防御率, starts: 登板数
export const PITCHER_LAST_YEAR = {
  // ソフトバンク
  '有原航平':     { wins: 14, losses: 5,  era: '2.23', starts: 22 },
  'モイネロ':     { wins: 10, losses: 4,  era: '2.35', starts: 18 },
  '東浜巨':       { wins: 8,  losses: 7,  era: '3.46', starts: 21 },
  '大津亮介':     { wins: 6,  losses: 5,  era: '3.89', starts: 16 },
  '石川柊太':     { wins: 5,  losses: 8,  era: '4.12', starts: 17 },
  'スチュワート': { wins: 7,  losses: 6,  era: '3.56', starts: 19 },
  // 阪神
  '才木浩人':     { wins: 11, losses: 5,  era: '2.08', starts: 19 },
  '大竹耕太郎':   { wins: 7,  losses: 6,  era: '2.97', starts: 17 },
  '西勇輝':       { wins: 9,  losses: 7,  era: '3.23', starts: 22 },
  '伊藤将司':     { wins: 6,  losses: 8,  era: '3.67', starts: 20 },
  '村上頌樹':     { wins: 4,  losses: 9,  era: '3.89', starts: 18 },
  '青柳晃洋':     { wins: 5,  losses: 7,  era: '3.78', starts: 17 },
  // DeNA
  '東克樹':       { wins: 15, losses: 5,  era: '1.98', starts: 26 },
  '濱口遥大':     { wins: 7,  losses: 6,  era: '3.45', starts: 20 },
  'バウアー':     { wins: 10, losses: 3,  era: '2.19', starts: 17 },
  'ジャクソン':   { wins: 5,  losses: 7,  era: '3.98', starts: 16 },
  '石田裕太郎':   { wins: 6,  losses: 7,  era: '3.67', starts: 18 },
  // 巨人
  '菅野智之':     { wins: 12, losses: 6,  era: '2.34', starts: 25 },
  '戸郷翔征':     { wins: 11, losses: 8,  era: '2.96', starts: 27 },
  'グリフィン':   { wins: 8,  losses: 6,  era: '3.12', starts: 22 },
  '山崎伊織':     { wins: 4,  losses: 5,  era: '3.78', starts: 14 },
  'メンデス':     { wins: 5,  losses: 7,  era: '4.02', starts: 16 },
  // 広島
  '床田寛樹':     { wins: 11, losses: 7,  era: '2.69', starts: 25 },
  '大瀬良大地':   { wins: 9,  losses: 6,  era: '2.78', starts: 22 },
  '九里亜蓮':     { wins: 7,  losses: 8,  era: '3.45', starts: 21 },
  'アドゥワ誠':   { wins: 5,  losses: 7,  era: '4.12', starts: 18 },
  '森下暢仁':     { wins: 8,  losses: 7,  era: '3.23', starts: 21 },
  // ヤクルト
  '小川泰弘':     { wins: 6,  losses: 9,  era: '3.87', starts: 22 },
  '吉村貢司郎':   { wins: 8,  losses: 7,  era: '3.12', starts: 21 },
  '高橋奎二':     { wins: 5,  losses: 8,  era: '4.23', starts: 19 },
  'サイスニード':  { wins: 6,  losses: 8,  era: '3.78', starts: 20 },
  // 中日
  '高橋宏斗':     { wins: 11, losses: 6,  era: '2.53', starts: 22 },
  '小笠原慎之介': { wins: 8,  losses: 8,  era: '3.34', starts: 23 },
  'メヒア':       { wins: 5,  losses: 6,  era: '3.97', starts: 17 },
  '涌井秀章':     { wins: 4,  losses: 7,  era: '4.12', starts: 16 },
  '松葉貴大':     { wins: 3,  losses: 6,  era: '4.56', starts: 14 },
  // 日本ハム
  '伊藤大海':     { wins: 11, losses: 6,  era: '2.89', starts: 24 },
  '金村尚真':     { wins: 8,  losses: 6,  era: '3.45', starts: 20 },
  '北山亘基':     { wins: 6,  losses: 7,  era: '3.76', starts: 19 },
  '山崎福也':     { wins: 7,  losses: 9,  era: '4.23', starts: 22 },
  'ポンセ':       { wins: 5,  losses: 7,  era: '4.45', starts: 16 },
  // 楽天
  '早川隆久':     { wins: 12, losses: 5,  era: '2.67', starts: 25 },
  '瀧中瞭太':     { wins: 9,  losses: 6,  era: '3.23', starts: 22 },
  '岸孝之':       { wins: 5,  losses: 7,  era: '3.89', starts: 18 },
  '田中将大':     { wins: 4,  losses: 8,  era: '4.34', starts: 17 },
  'ウェンデルケン': { wins: 6, losses: 5, era: '3.56', starts: 16 },
  // ロッテ
  '小島和哉':     { wins: 10, losses: 7,  era: '3.12', starts: 23 },
  '種市篤暉':     { wins: 8,  losses: 5,  era: '3.45', starts: 19 },
  '西野勇士':     { wins: 4,  losses: 6,  era: '4.34', starts: 15 },
  '石川歩':       { wins: 5,  losses: 8,  era: '3.98', starts: 18 },
  'メルセデス':   { wins: 6,  losses: 7,  era: '3.67', starts: 19 },
  // 西武
  '今井達也':     { wins: 7,  losses: 8,  era: '3.78', starts: 21 },
  '隅田知一郎':   { wins: 6,  losses: 9,  era: '4.12', starts: 20 },
  '武内夏暉':     { wins: 8,  losses: 6,  era: '3.23', starts: 21 },
  '渡邉勇太朗':   { wins: 5,  losses: 6,  era: '3.89', starts: 16 },
  // オリックス
  '山下舜平大':   { wins: 10, losses: 5,  era: '2.75', starts: 21 },
  '宮城大弥':     { wins: 9,  losses: 7,  era: '3.12', starts: 23 },
  '田嶋大樹':     { wins: 7,  losses: 8,  era: '3.67', starts: 21 },
  '山岡泰輔':     { wins: 5,  losses: 6,  era: '3.89', starts: 17 },
  '東晃平':       { wins: 6,  losses: 7,  era: '3.56', starts: 18 },
};
