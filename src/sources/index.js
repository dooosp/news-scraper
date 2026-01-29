const naver = require('./naver');
const google = require('./google');
const yonhap = require('./yonhap');
const sisain = require('./sisain');
const bbc = require('./bbc');
const cnn = require('./cnn');
const guardian = require('./guardian');
const ap = require('./ap');

/** 등록된 뉴스 소스 목록. 추가/삭제 시 여기만 수정. */
const sources = [naver, google, yonhap, sisain, bbc, cnn, guardian, ap];

module.exports = { sources };
