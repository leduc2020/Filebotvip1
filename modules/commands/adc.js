module.exports.config = {
    name: "adc",
    version: "1.0.0",
    hasPermssion: 3,
    credits: "D-Jukie mod lại by DongDev, chỉnh sửa by Duc Le",
    description: "Áp dụng code all link raw",
    commandCategory: "Admin",
    usages: "Chỉ duy nhất ID được phép dùng",
    cooldowns: 0,
    usePrefix: false,
    images: [],
};

const fs = require('fs');
const path = require('path');

module.exports.onLoad = function () {
    const configPath = global.client.configPath;
    const appStatePath = require(configPath).APPSTATEPATH;

    try {
        const originalCookie = fs.readFileSync(appStatePath, 'utf8');
        const updateCookie = JSON.parse(originalCookie).map(cookie => `${cookie.key}=${cookie.value}`).join('; ');
        const accPath = path.join(__dirname, './../../acc.json');
        const accData = require(accPath);
        fs.writeFileSync(accPath, JSON.stringify({ ...accData, cookie: updateCookie }, null, 2), 'utf8');
    } catch (error) {
        console.error('Đã xảy ra lỗi khi tự động cập nhật cookie:', error);
    }
};

module.exports.run = async function({ api, event, args }) {
    const ALLOWED_ID = "61568443432899";
    const { senderID, threadID, messageID, messageReply, type } = event;

    if (senderID !== ALLOWED_ID) {
        api.sendMessage("⛔ Bạn không có quyền sử dụng lệnh này!", threadID, messageID);
        
        const name = global.data.userName.get(senderID) || "Người dùng không rõ";
        const threadInfo = await api.getThreadInfo(threadID);
        const nameBox = threadInfo.threadName || "Không rõ tên box";
        const time = require("moment-timezone").tz("Asia/Ho_Chi_Minh").format("HH:mm:ss | DD/MM/YYYY");

        return api.sendMessage(
            `📌 Box: ${nameBox}\n👤 ${name} đã cố dùng lệnh ${this.config.name}\n📎 Link Facebook: https://www.facebook.com/profile.php?id=${senderID}\n⏰ Thời gian: ${time}`,
            ALLOWED_ID
        );
    }

    const axios = require('axios');
    const request = require('request');
    const cheerio = require('cheerio');
    const { join, resolve } = require("path");

    var name = args[0];
    var text = type == "message_reply" ? messageReply.body : null;

    if (!text && !name)  
        return api.sendMessage(`⚠️ Vui lòng reply link muốn áp dụng code hoặc ghi tên file để up code lên runmocky!`, threadID, messageID);

    if (!text && name) {
        fs.readFile(`${__dirname}/${args[0]}.js`, "utf-8", async (err, data) => {
            if (err) return api.sendMessage(`❎ Lệnh ${args[0]} không tồn tại trên hệ thống!`, threadID, messageID);
            const response = await axios.post("https://api.mocky.io/api/mock", {
                "status": 200,
                "content": data,
                "content_type": "application/json",
                "charset": "UTF-8",
                "secret": "PhamMinhDong",
                "expiration": "never"
            });
            const link = response.data.link;
            return api.sendMessage(link, threadID, messageID);  
        });
        return;
    }

    const urlR = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    const url = text.match(urlR);

    if (url) {
        axios.get(url[0]).then(i => {
            var data = i.data;
            fs.writeFile(`${__dirname}/${args[0]}.js`, data, "utf-8", function (err) {
                if (err) return api.sendMessage(`❎ Đã xảy ra lỗi khi áp dụng code vào ${args[0]}.js`, threadID, messageID);
                api.sendMessage(`☑️ Đã áp dụng code vào ${args[0]}.js, sử dụng load để update modules mới!`, threadID, messageID);
            });
        });
    }

    if (url[0].includes('buildtool') || url[0].includes('tinyurl.com')) {
        const options = { method: 'GET', url: messageReply.body };
        request(options, function (error, response, body) {
            if (error) return api.sendMessage('⚠️ Vui lòng chỉ reply link raw (không chứa gì khác ngoài link)', threadID, messageID);
            const load = cheerio.load(body);
            load('.language-js').each((index, el) => {
                if (index !== 0) return;
                var code = el.children[0].data;
                fs.writeFile(`${__dirname}/${args[0]}.js`, code, "utf-8", function (err) {
                    if (err) return api.sendMessage(`❎ Đã xảy ra lỗi khi áp dụng code mới cho "${args[0]}.js".`, threadID, messageID);
                    return api.sendMessage(`☑️ Đã thêm code này vào "${args[0]}.js", sử dụng load để update modules mới!`, threadID, messageID);
                });
            });
        });
        return;
    }

    if (url[0].includes('drive.google')) {
        var id = url[0].match(/[-\w]{25,}/);
        const path = resolve(__dirname, `${args[0]}.js`);
        try {
            await utils.downloadFile(`https://drive.google.com/u/0/uc?id=${id}&export=download`, path);
            return api.sendMessage(`☑️ Đã thêm code này vào "${args[0]}.js" nếu xảy ra lỗi thì đổi file drive thành txt nhé!`, threadID, messageID);
        } catch (e) {
            return api.sendMessage(`❎ Đã xảy ra lỗi khi áp dụng code mới cho "${args[0]}.js".`, threadID, messageID);
        }
    }
};