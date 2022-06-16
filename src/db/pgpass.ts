import path from 'path';
import fs from 'fs';

// windows: %APPDATA%\postgresql\pgpass.conf
// linux: $HOME/.pgpass
function getPasswordsFileName() {
  if (global.process.env.APPDATA) {
    return path.join(global.process.env.APPDATA, 'postgresql', 'pgpass.conf');
  }
  if (global.process.env.HOME) {
    return path.join(global.process.env.HOME, '.pgpass');
  }
  return null;
}

export function savePasswords(passwords: ConnectionConfiguration[]) {
  const fileName = getPasswordsFileName();
  if (!fileName) return;
  const content = passwords
    .map((p) => `${p.host}:${p.port}:${p.database}:${p.user}:${p.password}`)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join('\n');
  if (global.process.env.APPDATA) {
    const dir = path.join(global.process.env.APPDATA, 'postgresql');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
  } else if (global.process.env.HOME) {
    const dir = path.join(global.process.env.HOME, '.pgpass');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
  }
  fs.writeFileSync(fileName, content);
}

export interface ConnectionConfiguration {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

function getPasswords(): Array<ConnectionConfiguration> {
  const fileName = getPasswordsFileName();
  if (fileName && fs.existsSync(fileName)) {
    const str = fs.readFileSync(fileName).toString().trim();
    if (!str) return [];
    return str
      .split('\n')
      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
      .map((a: string) => a.trim().split(':'))
      .map((a: Array<string>) => {
        return {
          host: a[0],
          port: parseInt(a[1], 10),
          database: a[2],
          user: a[3],
          password: a[4],
        };
      });
  }
  return [];
}

const passwords = getPasswords();

export { passwords };
