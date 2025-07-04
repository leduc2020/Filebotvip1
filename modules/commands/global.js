let urls = require("./../../includes/datajson/vdgai.json");

const axios = require("axios");
const fs = require("fs");

class Command {

    constructor(config) {
        this.config = config;
        global.ytb_rst = [];
    };

    async onLoad(o) {
        let status = false;

        if (!global.client.xx) global.client.xx = setInterval(_ => {
            if (status == true || global.ytb_rst.length > 10) return;

            status = true;

            Promise.all([...Array(5)].map(e => upload(urls[Math.floor(Math.random() * urls.length)]))).then(res => {
                console.log(res, ...res);
                (global.ytb_rst.push(...res), status = false)
            });

        }, 1000 * 5);

        async function streamURL(url, type) {
            return axios.get(url, {
                responseType: 'arraybuffer'
            }).then(res => {
                const path = __dirname + `/cache/${Date.now()}.${type}`;
                fs.writeFileSync(path, res.data);
                setTimeout(p => fs.unlinkSync(p), 1000 * 60, path);
                return fs.createReadStream(path);
            });
        }

        async function upload(url) {
            return o.api.httpPostFormData('https://upload.facebook.com/ajax/mercury/upload.php', { upload_1024: await streamURL(url, 'mp4') }).then(res => Object.entries(JSON.parse(res.replace('for (;;);', '')).payload?.metadata?.[0] || {})[0]);
        };

    };

    async run(o) {
        const send = msg => new Promise(r => o.api.sendMessage(msg, o.event.threadID, (err, res) => r(res || err), o.event.messageID));

        const t = process.uptime();
        const h = Math.floor(t / (60 * 60));
        const p = Math.floor((t % (60 * 60)) / 60);
        const s = Math.floor(t % 60);

        let timeStart = Date.now();

        console.log(global.ytb_rst);

        send({
            body: ``,
            attachment: global.ytb_rst.splice(0, 1)
        });
    }

}

module.exports = new Command({
    name: "em",
    version: "0.0.1",
    hasPermssion: 2,
    credits: "DC-Nam",
    description: "",
    commandCategory: "Tiện ích",
    usages: "[]",
    cooldowns: 0,
});
