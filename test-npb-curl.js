import { exec } from 'child_process';
import util from 'util';
const execPromise = util.promisify(exec);

async function test() {
  const url = 'https://npb.jp/bis/players/41245138.html';
  try {
    const { stdout } = await execPromise(`curl -s "${url}" | tr -d '\\n' | grep -oE "右投|左投|両投|右打|左打|両打"`);
    console.log("Stdout:", stdout);
  } catch (e) {
    console.error(e);
  }
}
test();
