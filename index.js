let
    request = require('request'),
    moment = require("moment"),
    fs = require('fs'),
    EventEmitter = require("events").EventEmitter,

    firstPage = require('./first_page');

const
    podcastId = process.argv[2] || new Error("No podcast id provided"),
    fileName = 'result/' + (process.argv[3] || `podcast-${podcastId}`),
    firstPageUrl = `http://radiomayak.ru/podcasts/podcast/id/${podcastId}/`;

const r = request.defaults({
    "baseUrl": `http://radiomayak.ru/podcasts/loadepisodes/podcast/${podcastId}/page`,
    "method": "GET",
    "json": true
});


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
class DataLoader extends EventEmitter {
    constructor(req) {
        super();
        this.request = req || new Error("Request not provided");
        this.data = [];
        this.firstPageArr = [];

        this.on('load', this.loadLastData);
        this.on('loadNext', this.loadData);
        this.on('loadEnd', this.processResult);
        console.log('Loader ctor');
    }

    loadLastData() {
        console.log('Load last page data');
        let objectData = this.firstPageArr,
            that = this;

        firstPage(firstPageUrl, function(arr) {
            if (arr && Array.isArray(arr)) {
                arr.forEach(it => objectData.push(it));
                console.log(`Last page data. LOADED ${objectData.length}`);
            } else {
                console.log(`Last page data. LOADED ZERO`);
            }
            that.emit('loadNext', 1);
        });
    }

    loadData(id) {
        console.log('Load data with id:' + id);
        let obj = this;
        this.request.get("/" + id, (err, resp, body) => {
            if (body && body !== null) {
                body.episodes.forEach(e => obj.data.push(e));
                console.log('Episoded length: ' + body.episodes.length + ', total: ' + obj.data.length);

                if (body.next_page === 'false') {
                    console.log('END loading. Data with Id:' + id + ' is empty');
                    this.emit('loadEnd');
                } else {
                    console.log('Proceed to NEXT load with id:' + body.next_page);
                    obj.emit('loadNext', body.next_page);
                }
            } else {
                console.log('Unexpected empty body');
            }
        });
    }

    processResult() {
        let episodesArr = this.data
            .map(e => ({
                "title": e.title,
                "descr": e.anons,
                "date": toStdDateStr(e.dateRec),
                "stream": e.audio[0].sources.listen,
                "duration_sec": e.audio[0].duration
            }));
        this.firstPageArr.forEach(item => episodesArr.push(item));
        episodesArr = episodesArr.sort((a, b) => compareDate(a.date, b.date));

        fs.writeFileSync(fileName + ".json", JSON.stringify(episodesArr, null, 2), function (err) {
            console.log(err);
        });
        writePlaylist(episodesArr);
    }

    load() { this.emit('load'); }
}

let ld = new DataLoader(r);
ld.load();

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function writePlaylist(data) {
    let playlistFile = fs.openSync(fileName + ".m3u", 'w');

    fs.appendFileSync(playlistFile, "#EXTM3U\n");

    data.forEach(episode => {
        let recordStr =
            "#EXTINF:" + episode.duration_sec + ", " + episode.title + "\n" +
            episode.stream + "\n";
        fs.appendFileSync(playlistFile, recordStr);
    });
}

const RECORD_DATE_FORMAT = "DD-MM-YYYY HH:mm:ss";

function toStdDateStr(mayakDate) {
    return moment(mayakDate, RECORD_DATE_FORMAT).format();
}

function compareDate(a, b) {
    return new Date(a).getTime() - new Date(b).getTime();
}
