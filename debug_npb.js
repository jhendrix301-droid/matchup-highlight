import axios from 'axios';

async function test() {
  const url = 'https://npb.jp/bis/teams/rst_h.html';
  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ja'
    }
  });
  
  // Check if page contains anchor markers
  console.log('Has name="pit":', data.includes('name="pit"'));
  console.log('Has name="cat":', data.includes('name="cat"'));
  console.log('Has id="pit":', data.includes('id="pit"'));
  
  // Find the context around "投手" text
  const pitIdx = data.indexOf('投手');
  if (pitIdx > -1) {
    console.log('Context around 投手:', data.substring(Math.max(0, pitIdx - 100), pitIdx + 200));
  }
  
  // Check title
  const titleMatch = data.match(/<title>(.*?)<\/title>/);
  console.log('Page title:', titleMatch ? titleMatch[1] : 'NOT FOUND');
}
test();
