// パスワード認証 API（48時間 Cookie）
export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body || {};

  if (password === 'btai') {
    // 48時間 = 172800秒
    res.setHeader(
      'Set-Cookie',
      '_v2auth=authorized; Path=/; SameSite=Lax; Max-Age=172800'
    );
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ error: 'Unauthorized' });
}
