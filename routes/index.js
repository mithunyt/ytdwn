const express = require('express');
const router = express.Router();
const axios = require('axios')
const Video = require('../models/Video')
const Faq = require('../models/Faq')
const Resolution = require('../models/Resolution')
const youtubedl = require('youtube-dl-exec')
const moment = require('moment');
const multer = require('multer')
const fs = require('fs');

const body = multer({})

//  random hex string generator
var randHex = function(len) {
  var maxlen = 8,
      min = Math.pow(16,Math.min(len,maxlen)-1) 
      max = Math.pow(16,Math.min(len,maxlen)) - 1,
      n   = Math.floor( Math.random() * (max-min+1) ) + min,
      r   = n.toString(16);
  while ( r.length < len ) {
     r = r + randHex( len - maxlen );
  }
  return r;
};

function convertFileSize(num){
  if (!num){
    return 'unknown'
  }
  else{
    let kb = num/1024
    if (kb < 1024)
      return kb.toFixed(2) + 'kb'
    else{
      let mb = kb/1024
      if (mb < 1024)
          return mb.toFixed(2) + 'mb'
      else{
          gb = mb/1024
          return gb.toFixed(2) + 'gb'
      }
    }
  }
}

var get_size = async function(url){
  let response = await axios.head(url)
  if(response.headers.hasOwnProperty('content-length')){
    return convertFileSize(response.headers['content-length'])
  }
  else{
    return 'unknown'
  }
}

function compare( a, b ) {
  if ( parseInt(a.resolution) < parseInt(b.resolution) ){
    return 1;
  }
  if ( parseInt(a.resolution) > parseInt(b.resolution) ){
    return -1;
  }
  return 0;
}

async function youtube(meta){
  let video_streams = []
  let video_without_sound = []
  let audio_streams = []

  const video = new Video({
    web_url: meta.webpage_url,
    thumbnail: meta.thumbnail,
    title: meta.title,
    dw_date: moment().format("MMM Do"),
    source: 'Youtube'
  })
  await video.save()

  meta.formats.forEach(m => {
    let token = randHex(32)
    if(m.acodec != 'none' && m.vcodec != 'none'){
      video_streams.push({
        'resolution': m.format_note,
        'filesize': convertFileSize(m.filesize),
        'ext': m.ext,
        'token': token
      })
    }            
    else if(m.acodec == 'none' && m.vcodec != 'none'){
      video_without_sound.push({
        'resolution': m.format_note,
        'filesize': convertFileSize(m.filesize),
        'ext': m.ext,
        'token': token
      })
    }            
    else if(m.acodec != 'none' && m.vcodec == 'none'){
      audio_streams.push({
        'resolution': 'audio',
        'filesize': convertFileSize(m.filesize),
        'ext': m.ext,
        'token': token
      })
    }
    let res = new Resolution({
      download_url: m.url,
      ext: m.ext,
      token: token,
      vid_id: video._id
    })
    res.save().then(res => {})
  });  

  let context = {
    'error': false,
    'duration': 'Duration: ' + moment.utc(meta.duration*1000).format('HH:mm:ss'),
    'thumbnail': meta.thumbnail,
    'title': meta.title,
    'video_streams': video_streams.sort(compare),
    'video_without_sound': video_without_sound.sort(compare),
    'audio_streams': audio_streams
  }
  return context
}

async function twitter(meta){
  let video_streams = []

  const video = new Video({
    web_url: meta.webpage_url,
    thumbnail: meta.thumbnail,
    title: meta.title,
    dw_date: moment().format("MMM Do"),
    source: 'Twitter'
  })
  await video.save()

  for (const m of meta.formats) {
    let token = randHex(32)
    if(m.protocol == 'https'){
      video_streams.push({
        'resolution': m.height + 'p',
        'filesize': await get_size(m.url),
        'ext': m.ext,
        'token': token
      })
    }            

    let res = new Resolution({
      download_url: m.url,
      ext: m.ext,
      token: token,
      vid_id: video._id
    })
    res.save().then(res => {})
  };  

  let context = {
    'error': false,
    'duration': 'Duration: ' + moment.utc(meta.duration*1000).format('HH:mm:ss'),
    'thumbnail': meta.thumbnail,
    'title': meta.title,
    'video_streams': video_streams.sort(compare),
  }
  return context
}

async function izlesene(meta){
  let video_streams = []

  const video = new Video({
    web_url: meta.webpage_url,
    thumbnail: meta.thumbnail,
    title: meta.title,
    dw_date: moment().format("MMM Do"),
    source: 'Izlesene'
  })
  await video.save()

  for (const m of meta.formats) {
    let token = randHex(32)
    video_streams.push({
      'resolution': m.format_id,
      'filesize': await get_size(m.url),
      'ext': m.ext,
      'token': token
    })

    let res = new Resolution({
      download_url: m.url,
      ext: m.ext,
      token: token,
      vid_id: video._id
    })
    res.save().then(res => {})
  };  

  let context = {
    'error': false,
    'duration': 'Duration: ' + moment.utc(meta.duration*1000).format('HH:mm:ss'),
    'thumbnail': meta.thumbnail,
    'title': meta.title,
    'video_streams': video_streams.sort(compare),
  }
  return context
}

async function vimeo(meta){
  let video_streams = []

  const video = new Video({
    web_url: meta.webpage_url,
    thumbnail: meta.thumbnail,
    title: meta.title,
    dw_date: moment().format("MMM Do"),
    source: 'Vimeo'
  })
  await video.save()

  
  for (const m of meta.formats) {
    let token = randHex(32)
    if(m.protocol == 'https'){
      video_streams.push({
        'resolution': m.format_id.split('-')[1],
        'filesize': await get_size(m.url),
        'ext': m.ext,
        'token': token
      })
    }
    
    let res = new Resolution({
      download_url: m.url,
      ext: m.ext,
      token: token,
      vid_id: video._id
    })
    res.save().then(res => {})
  };  

  let context = {
    'error': false,
    'duration': 'Duration: ' + moment.utc(meta.duration*1000).format('HH:mm:ss'),
    'thumbnail': meta.thumbnail,
    'title': meta.title,
    'video_streams': video_streams.sort(compare),
  }
  return context
}

async function instagram(meta){
  let video_streams = []
  let imgt = randHex(16)
  
  const response = await axios({
    method: 'GET',
    url: meta.thumbnail,
    responseType: 'stream',
  });

  response.data.pipe(fs.createWriteStream('public/images/' + imgt + '.jpg'))
  let thumbnail = 'images/' + imgt + '.jpg'

  const video = new Video({
    web_url: meta.webpage_url,
    thumbnail: thumbnail,
    title: meta.title,
    dw_date: moment().format("MMM Do"),
    source: 'Instagram'
  })
  await video.save()

  for (const m of meta.formats) {
    let token = randHex(32)
    if(m.ext == 'mp4'){
      video_streams.push({
        'resolution': m.format.split(' - ')[1],
        'filesize': await get_size(m.url),
        'ext': m.ext,
        'token': token
      })
    }

    let res = new Resolution({
      download_url: m.url,
      ext: m.ext,
      token: token,
      vid_id: video._id
    })
    res.save().then(res => {})
  };  

  let context = {
    'error': false,
    'duration': 'Duration: ' + moment.utc(meta.duration*1000).format('HH:mm:ss'),
    'thumbnail': thumbnail,
    'title': meta.title,
    'video_streams': video_streams
  }
  return context
}

async function vlive(meta){
  let video_streams = []

  const video = new Video({
    web_url: meta.webpage_url,
    thumbnail: meta.thumbnail,
    title: meta.title,
    dw_date: moment().format("MMM Do"),
    source: 'Vlive'
  })
  await video.save()

  for (const m of meta.formats) {
    let token = randHex(32)
    let filesize
    if(m.hasOwnProperty('filesize')){
      filesize = m.filesize
    }
    else{
      filesize = await get_size(m.url)
    }
    if(m.ext == 'mp4'){
      video_streams.push({
        'resolution': m.format_id.split('_')[1],
        'filesize': convertFileSize(filesize),
        'ext': m.ext,
        'token': token
      })
    }

    let res = new Resolution({
      download_url: m.url,
      ext: m.ext,
      token: token,
      vid_id: video._id
    })
    res.save().then(res => {})
  };  

  let context = {
    'error': false,
    'duration': 'Duration: ' + moment.utc(meta.duration*1000).format('HH:mm:ss'),
    'thumbnail': meta.thumbnail,
    'title': meta.title,
    'video_streams': video_streams.sort(compare)
  }
  return context
}

async function soundcloud(meta){
  let audio_streams = []

  const video = new Video({
    web_url: meta.webpage_url,
    thumbnail: meta.thumbnail,
    title: meta.title,
    dw_date: moment().format("MMM Do"),
    source: 'SoundCloud'
  })
  await video.save()

  for (const m of meta.formats) {
    let token = randHex(32)
    if(m.protocol == 'http'){
      audio_streams.push({
        'resolution': 'audio',
        'filesize': await get_size(m.url),
        'ext': m.ext,
        'token': token
      })
    }
    
    let res = new Resolution({
      download_url: m.url,
      ext: m.ext,
      token: token,
      vid_id: video._id
    })
    res.save().then(res => {})
  };  

  let context = {
    'error': false,
    'duration': 'Duration: ' + moment.utc(meta.duration*1000).format('HH:mm:ss'),
    'thumbnail': meta.thumbnail,
    'title': meta.title,
    'audio_streams': audio_streams,
  }
  return context
}

// Welcome Page
router.get('/', async (req, res) => {
  const dw_list = ['youtube', 'twitter', 'instagram', 'vlive', 'vimeo', 'soundcloud', 'izlesene']
  var dw = req.query.downloader
  if(dw && !dw_list.includes(dw)){
    res.sendStatus(404)
  }
  else{
    res.render('public/index', {
      dw: dw,
      faqs: await Faq.find({})
    })
  }
});

// Dashboard
router.post('/extractor', body.none(), async (req, res) =>{
  const meta = await youtubedl(req.body.inputValue, {
    dumpSingleJson: true,
    noWarnings: true,
    noCallHome: true,
    noCheckCertificate: true,
    preferFreeFormats: true,
    youtubeSkipDashManifest: true,
    referer: req.body.inputValue
  })

  // let data = JSON.stringify(meta);
  // fs.writeFileSync('vlive2.json', data);

  // let rawdata = fs.readFileSync('vlive2.json');
  // let meta = JSON.parse(rawdata);

  if(meta.extractor == 'youtube'){
    res.send(await youtube(meta)) 
  }
  else if(meta.extractor == 'twitter'){
    res.send(await twitter(meta)) 
  }
  else if(meta.extractor == 'Izlesene'){
    res.send(await izlesene(meta)) 
  }
  else if(meta.extractor == 'vimeo'){
    res.send(await vimeo(meta)) 
  }
  else if(meta.extractor == 'soundcloud'){
    res.send(await soundcloud(meta)) 
  }
  else if(meta.extractor == 'Instagram'){
    res.send(await instagram(meta))
  }
  else if(meta.extractor == 'vlive'){
    res.send(await vlive(meta))
  }
});

router.get('/download', async (req, res) =>{
  const resolution = await Resolution.findOne({ token: req.query.token }).populate('vid_id', 'title').exec()
  let filename = (resolution.vid_id.title).replace(/[^a-zA-Z ]/g, "") + '.' + resolution.ext

  if(!resolution){
    res.sendStatus(404)
  }
  else{
    axios({
      method: 'get',
      url: resolution.download_url,
      responseType: 'stream'
    })
      .then(function(response) {
        if(response.headers.hasOwnProperty('content-length')){
          res.setHeader('content-length', response.headers['content-length'])
          res.setHeader("content-disposition", "attachment; filename=" + filename);
        }
        else{
          res.setHeader("content-disposition", "attachment; filename=" + filename);
        }
        response.data.pipe(res)
    });
  }
});

module.exports = router;
