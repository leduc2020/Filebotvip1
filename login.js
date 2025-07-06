const fs = require("fs-extra");
const login = require("@duyhau/fca-unofficial");
const readline = require("readline");
const totp = require("totp-generator");
const os = require("os");
const logger = require("./utils/log");
const chalk = require("chalk");
const gradient = require("gradient-string");

const argv = process.argv.slice(2);
const configPath = argv[0] || "./acc.json";
const config = require(configPath);
const con = require("./config.json");

const email = config.EMAIL;
const password = config.PASSWORD;
const otpkey = config.OTPKEY.replace(/\s+/g, "").toLowerCase();
const appstatePath = "./appstate.json"; // Ghi appstate cố định tại đây

// Xử lý giao diện theme
const theme = (con.DESIGN.Theme || "").toLowerCase();
const themes = {
  blue: gradient("#243aff", "#4687f0", "#5800d4"),
  fiery: gradient("#fc2803", "#fc6f03", "#fcba03"),
  red: gradient("red", "orange"),
  aqua: gradient("#0030ff", "#4e6cf2"),
  pink: gradient("#d94fff", "purple"),
  retro: gradient.retro,
  sunlight: gradient("orange", "#ffff00", "#ffe600"),
  teen: gradient.teen,
  summer: gradient.summer,
  flower: gradient.pastel,
  ghost: gradient.mind,
  hacker: gradient("#47a127", "#0eed19", "#27f231"),
};
const co = themes[theme] || themes.blue;
const error = chalk.red.bold;

const networkInterfaces = os.networkInterfaces();
const ipAddresses = [];
for (const key in networkInterfaces) {
  for (const iface of networkInterfaces[key]) {
    if (!iface.internal && iface.family === "IPv4") {
      ipAddresses.push(iface.address);
    }
  }
}

console.log(co("┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"));
logger("Đang tiến hành đăng nhập...", "┣➤ [ LOGIN - TRAMANH-YUZ ]");
logger(`Email: ${email}`, "┣➤ [ LOGIN - TRAMANH-YUZ ]");
logger(`Password: ${password}`, "┣➤ [ LOGIN - TRAMANH-YUZ ]");
logger(`IP: ${ipAddresses.join(", ")}`, "┣➤ [ LOGIN - TRAMANH-YUZ ]");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const options = {
  logLevel: "silent",
  forceLogin: true,
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36",
};

login({ email, password }, options, (err, api) => {
  if (err) {
    if (err.error === "login-approval") {
      if (otpkey) {
        err.continue(totp(otpkey));
      } else {
        logger("Vui lòng nhập mã xác minh 2 bước:", "┣➤ [ LOGIN - TRAMANH-YUZ ]");
        rl.on("line", (line) => {
          err.continue(line.trim());
          rl.close();
        });
      }
    } else {
      console.error(error(err));
      process.exit(1);
    }
    return;
  }

  fs.writeFileSync(appstatePath, JSON.stringify(api.getAppState()));
  logger("Đăng nhập thành công!", "┣➤ [ LOGIN - TRAMANH-YUZ ]");
  logger(`Đã ghi AppState vào ${appstatePath}`, "┣➤ [ LOGIN - TRAMANH-YUZ ]");
  console.log(co("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"));
});
