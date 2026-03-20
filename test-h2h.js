import axios from 'axios';

async function test() {
  try {
    const url = 'http://localhost:5176/baseball/api/matchResultSearch?pitcherTeamId=9&batterTeamId=8&pitcherId=748&batterId=1308&selectedYear=通算';
    const { data } = await axios.get(url);
    console.log(data?.data?.matchResult[0]);
  } catch (e) {
    console.error(e);
  }
}
test();
