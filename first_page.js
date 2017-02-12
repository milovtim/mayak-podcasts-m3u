'use strict';
const
    jsdom = require('jsdom');

function readFirstPage(url, callback) {
    jsdom.env({
        url : url,
        scripts : ["http://code.jquery.com/jquery.js"],
        done : function (err, window) {
            let $ = window.$;

            let resultArr = $('.b-podcast__records-item').map(function() {
                let $block = $(this),
                    data = {
                        title:          $block.find('.b-podcast__records-name').text().trim(),
                        date:           parseDate($block.find('.b-podcast__records-date').text().trim()),
                        duration_sec:   parseDurationToSeconds($block.find('.b-podcast__records-time').text().trim()),
                        stream:         $block.find('.b-podcast__records-listen').attr('data-url'),
                        descr:          $block.find('.b-podcast__records-description__text').text().trim().replace(/(\\n)+/, ' '),
                    };

                // console.log(`Load first page data, id=${url.match(/id\/(\d+)/)[1]}`);
                // console.log(JSON.stringify(data));
                return data;
            }).get();
            // console.log(JSON.stringify(resultArr));
            callback(resultArr);
        }
    });
}

module.exports = readFirstPage;

function parseDate(s) {
    let str = s.match(/\d{2}\.\d{2}\.\d{4}/)[0];
    return toStdDateStr(str);
}

const RECORD_DATE_FORMAT = "DD.MM.YYYY";

function toStdDateStr(mayakDate) {
    return require('moment')(mayakDate, RECORD_DATE_FORMAT).format();
}

function parseDurationToSeconds(s) {
    let arr = s.match(/(\d{1,2}):(\d{1,2})/);
    //minutes
    return parseInt(arr[1]) * 60 + parseInt(arr[2]);
}