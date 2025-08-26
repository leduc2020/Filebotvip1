const fs = require("fs");
const path = require("path");
const axios = require("axios");
const request = require("request");
const cheerio = require("cheerio");
const { v4: uuidv4 } = require("uuid");

module.exports.config = {
    name: "adc",
    version: "1.1.0",
    hasPermssion: 3,
    credits: "thuylinh",
    description: "Áp dụng code từ link raw hoặc up code file lên note server",
    commandCategory: "Admin",
    usages: "adc <tênfile> hoặc reply link raw",
    cooldowns: 0,
    usePrefix: false,
    images: [],
};

module.exports.run = async function({ api, event, args }) {
    const ALLOWED_ID = "61568443432899";
    const { senderID, threadID, messageID, messageReply, type } = event;
    const send = msg => new Promise(r => api.sendMessage(msg, threadID, (err, res) => r(res), messageID));

    if (senderID !== ALLOWED_ID) {
        api.sendMessage("⛔ Bạn không có quyền sử dụng lệnh này!", threadID, messageID);
        return;
    }

    const name = args[0];
    const text = type == "message_reply" ? messageReply.body : null;

    if (!name && !text) return send("⚠️ Vui lòng nhập tên file hoặc reply link raw.");

    const filePath = path.join(__dirname, `${name}.js`);

    // Nếu reply link raw
    if (text) {
        const urlR = /https?:\/\/[^\s]+/g;
        const url = text.match(urlR);
        if (!url || url.length === 0) return send("⚠️ Vui lòng chỉ reply link raw hợp lệ!");
        const link = url[0];

        try {
            // Node Note server
            if (link.includes("103.116.52.252:14280/note/")) {
                const res = await axios.get(link.includes("?raw=true") ? link : link + "?raw=true");
                fs.writeFileSync(filePath, res.data, "utf-8");
                return send(`☑️ Đã áp dụng code từ note server vào ${name}.js`);
            }

            // Buildtool / tinyurl
            if (link.includes("buildtool") || link.includes("tinyurl.com")) {
                request({ method: "GET", url: text }, function(error, response, body) {
                    if (error) return send("⚠️ Vui lòng chỉ reply link raw hợp lệ!");
                    const $ = cheerio.load(body);
                    $(".language-js").each((i, el) => {
                        if (i !== 0) return;
                        const code = el.children[0].data;
                        fs.writeFileSync(filePath, code, "utf-8");
                        return send(`☑️ Đã áp dụng code vào "${name}.js"`);
                    });
                });
                return;
            }

            // Google Drive
            if (link.includes("drive.google")) {
                const id = link.match(/[-\w]{25,}/);
                const filepath = path.resolve(__dirname, `${name}.js`);
                try {
                    await downloadFile(`https://drive.google.com/u/0/uc?id=${id}&export=download`, filepath);
                    return send(`☑️ Đã áp dụng code vào "${name}.js"`);
                } catch (e) {
                    return send(`❎ Lỗi khi áp dụng code từ Google Drive cho "${name}.js".`);
                }
            }

            // Fallback raw link
            const resFallback = await axios.get(link);
            fs.writeFileSync(filePath, resFallback.data, "utf-8");
            return send(`☑️ Đã áp dụng code mới vào ${name}.js`);
        } catch (e) {
            return send(`❎ Không lấy được code từ link!`);
        }
    } else {
        // Không reply => upload code file lên Node Note server
        if (!fs.existsSync(filePath)) return send(`❎ Lệnh ${name} không tồn tại trên hệ thống!`);
        return await module.exports.uploadFile(send, filePath, { api, event });
    }
};

// Upload file lên Node Note server
module.exports.uploadFile = async function(send, filePath, o) {
    const noteId = uuidv4();
    const url_base = `http://103.116.52.252:14280/note/${noteId}`;
    const fileContent = fs.readFileSync(filePath, "utf-8");

    try {
        await axios.put(`${url_base}?raw=true`, fileContent, {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });

        const rawUrl = `${url_base}?raw=true`;
        const editUrl = url_base;

        return send(
            `✅ Upload thành công!\n\n📂 File: ${path.relative(process.cwd(), filePath)}\n📝 Raw: ${rawUrl}\n✏️ Edit: ${editUrl}`
        ).then(res => {
            res = { ...res, name: "note", path: filePath, o, url: rawUrl, action: "confirm_replace" };
            global.client.handleReaction.push(res);
        });
    } catch (e) {
        return send(`❌ Lỗi khi upload file: ${e.message}`);
    }
};

// Handle reply khi chọn file
module.exports.handleReply = async function(o) {
    const _ = o.handleReply;
    const send = msg => new Promise(r => o.api.sendMessage(msg, o.event.threadID, (err, res) => r(res), o.event.messageID));
    if (o.event.senderID != _.o.event.senderID) return;

    const selectedIndex = parseInt(o.event.body) - 1;
    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= _.foundFiles.length) return send(`❌ Số không hợp lệ!`);
    const selectedFile = _.foundFiles[selectedIndex];
    return await module.exports.uploadFile(send, selectedFile, _.o);
};

// Handle reaction khi xác nhận replace
module.exports.handleReaction = async function(o) {
    const _ = o.handleReaction;
    const send = msg => new Promise(r => o.api.sendMessage(msg, o.event.threadID, (err, res) => r(res), o.event.messageID));
    if (o.event.userID != _.o.event.senderID) return;

    if (_.action === "confirm_replace") {
        try {
            const content = (await axios.get(_.url)).data;
            fs.writeFileSync(_.path, content, "utf-8");
            return send(`✅ Đã cập nhật file!\n📂 ${path.relative(process.cwd(), _.path)}\n⏰ ${new Date().toLocaleString("vi-VN")}`);
        } catch (e) {
            return send(`❌ Lỗi khi replace: ${e.message}`);
        }
    }
};

// Helper download file từ Google Drive
async function downloadFile(url, filepath) {
    const writer = fs.createWriteStream(filepath);
    const response = await axios({ url, method: "GET", responseType: "stream" });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
    });
}
