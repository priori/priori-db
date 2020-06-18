const path = (window as any).require("path");
const fs = (window as any).require("fs");

// windows: %APPDATA%\postgresql\pgpass.conf
// linux: $HOME/.pgpass
function getPasswordsFileName() {
  if ((window as any).process.env.APPDATA) {
    return path.join(
      (window as any).process.env.APPDATA,
      "postgresql",
      "pgpass.conf"
    );
  } else if ((window as any).process.env.HOME) {
    return path.join((window as any).process.env.HOME, ".pgpass");
  } else {
    return null;
  }
}

export function savePasswords(
  passwords: ConnectionConfiguration[],
  callBack: (err: any) => void
) {
  const fileName = getPasswordsFileName();
  const content = passwords
    .map(p => `${p.host}:${p.port}:${p.database}:${p.user}:${p.password}`)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join("\n");
  const dir = path.join((window as any).process.env.APPDATA, "postgresql");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  fs.writeFile(fileName, content, callBack);
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
    const str = fs
      .readFileSync(fileName)
      .toString()
      .trim();
    if (!str) return [];
    return str
      .split("\n")
      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
      .map((a: string) => a.trim().split(":"))
      .map((a: Array<string>) => {
        return {
          host: a[0],
          port: parseInt(a[1]),
          database: a[2],
          user: a[3],
          password: a[4]
        };
      });
  }
  return [];
}

const passwords = getPasswords();

export { passwords };
