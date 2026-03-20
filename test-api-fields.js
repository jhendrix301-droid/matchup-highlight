import axios from 'axios';

const API_BASE = 'https://baseball-pitcher-vs-batter.com/baseball/api';

async function test() {
  const pitcherRes = await axios.get(`${API_BASE}/getPitcherList`, {
    params: { teamId: 2, year: '2024' } // Giants
  });
  const batterRes = await axios.get(`${API_BASE}/getBatterList`, {
    params: { teamId: 2, year: '2024' }
  });
  
  console.log("Pitcher 0:", pitcherRes.data?.data?.pitcherList[0]);
  console.log("Batter 0:", batterRes.data?.data?.batterList[0]);
}
test();
