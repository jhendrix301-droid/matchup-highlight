import axios from 'axios';

async function test() {
  const url = 'https://npb.jp/bis/teams/rst_h.html';
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'ja' }
  });
  
  // Show 500 chars after pit anchor
  const pitStart = data.indexOf('<a name="pit">');
  console.log('=== After pit anchor (500 chars) ===');
  console.log(data.substring(pitStart, pitStart + 500));
  
  console.log('\n\n=== After cat anchor (300 chars) ===');
  const catStart = data.indexOf('<a name="cat">');
  console.log(data.substring(catStart, catStart + 300));
}
test();
