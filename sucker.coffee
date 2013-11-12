#!/usr/bin/env node
program = require 'commander'
ProgressBar = require 'progress'
https = require 'https'
http = require 'http'
fs = require 'fs'
_ = require 'lodash'
moment = require 'moment'

program
.version('0.0.1')
.option('-c, --client-id <imgur App Client Id>', 'imgur client id')
.option('-p, --pages <pages>', 'number of pages to suck [10]', Number, 10)
.option('-s, --subreddit <subreddit>', 'subreddit to suck [cats]', 'cats')
.option('-l, --logging <boolean>', 'log downloaded image data to json file [true]', true)
.option('-d, --download <boolean>', 'download the files found [true]', 'true')
.option('-r, --rate-limit-check', 'check your current imgur credits to prevent rate limiting')
.parse(process.argv)



suck = ->
  subredditName = program.subreddit
  console.log "processsing: " + subredditName
  
  #app.io.broadcast('global:function', {message: 'Processing Queue: ' + subredditName});
  pages = program.pages
  startPage = 0
  pageURL = ""
  pagesDone = 0
  
  #the imgur API Path
  apiYear = "/3/gallery/r/" + subredditName + "/top/year/"
  apiMonth = "/3/gallery/r/" + subredditName + "/top/month/"
  apiWeek = "/3/gallery/r/" + subredditName + "/top/week/"
  apiDay = "/3/gallery/r/" + subredditName + "/top/day/"
  apiLatest = "/3/gallery/r/" + subredditName + "/time/"
  urls = new Array()
  options = null
  data = new Array()
  idList = new Array()
  
  #get each page of imgur results from the imgur api
  i = startPage

  while i < startPage + pages
    urls.push apiYear + i
    urls.push apiMonth + i
    urls.push apiWeek + i
    urls.push apiDay + i
    urls.push apiLatest + i
    i++
  bar = new ProgressBar 'scanning [:bar] :percent :etas', {
    total: urls.length
    width: 100
  }


  urls.forEach (pageURL) ->
    options =
      hostname: "api.imgur.com"
      path: pageURL
      headers:
        Authorization: "Client-ID " + program.clientId

      method: "GET"


    https.get options, (res) ->
      doc = ""
      res.on "data", (chunk) ->
        doc += chunk

      res.on "end", ->
        json = JSON.parse(doc)
        spliceCount = 0
        imageArray = new Array()
        bar.tick()
        if json.data.length > 0
          json.data.forEach (image, index, array) ->
            if idList.indexOf(image.id) is -1
              idList.push image.id
              ext = image.link.match(/\.\w+$/)
              image.link = image.link.replace(/\.\w+$/, "l" + ext).replace(/http:\/\/i.imgur.com\//g, "")
              imageArray.push image


          data.push.apply data, imageArray

        if ++pagesDone is pages * 5
            if data.length > 0
              console.log "Images Found: " + data.length
              getImagesFromSubreddit subredditName, data

    .on "error", (e) ->
      console.log "HTTPS Load Error: " + e.message


getImagesFromSubreddit = (subreddit, imageList) ->
  originalList = _.clone imageList, true
  #fudge the numbers a bit
  imagesComplete = 1
  totalImages = imageList.length
  percent = 0
  console.log 'Total Images Found:', totalImages
  bar = new ProgressBar('downloading [:bar] :current/:total images | :etas remaining', {
    total: totalImages
    width: 100
    callback: ->
      console.log '\nSucking Complete'
      if program.logging
        fs.writeFile process.cwd() + "/sucked/" + subreddit + "/_" + subreddit + ".js", 'module.exports = ' + JSON.stringify(originalList, null, 4), 'utf8', (err) ->
          if err
            throw err
          console.log "_#{subreddit}.js written to images/#{subreddit} directory"
        console.log 'You now have', totalImages, subreddit, 'pictures'
  })




  
  #check for file existance
  if !fs.existsSync process.cwd() + '/sucked'
    fs.mkdirSync(process.cwd() + '/sucked')
  fs.exists process.cwd() + "/sucked/" + subreddit, (dirExists) ->
    
    #check for directory existance and create it if it doesn't
    fs.mkdirSync(process.cwd() + "/sucked/" + subreddit) unless dirExists
    imageList.forEach (image, index, array) ->

        
        #grab the file name for local saving
        filename = image.link
        
        #check to see if the file exists locally, so that we don't just absolutely hammer imgur
        fs.exists process.cwd() + "/sucked/" + subreddit + "/" + filename, (exists) ->
          unless exists
            try
              #grab the image from imgur
              imageRequest = http.get "http://i.imgur.com/" + image.link, (imageResults) ->
                imagedata = ""
                imageResults.setEncoding "binary"
                imageResults.on "data", (chunk) ->
                  imagedata += chunk

                # end imageResults data
                imageResults.on "end", ->
                  bar.tick()
                  fs.writeFile process.cwd() + "/sucked/" + subreddit + "/" + filename, imagedata, "binary", (err) ->
                    if err
                      console.log "ERROR WRITING FILE: " + err
                      throw (err)                    
                    
              
            catch e
              console.log "ERROR GETTING IMAGE: " + e
          else
            bar.tick()

checkRateLimit = ->
  options =
      hostname: "api.imgur.com"
      path: '/3/credits'
      headers:
        Authorization: "Client-ID " + program.clientId
      method: "GET"
  https.get options, (res) ->
    doc = ""
    res.on "data", (chunk) ->
      doc += chunk

    res.on "end", ->
      json = JSON.parse(doc)
      console.log 'Used:', (json.data.UserLimit - json.data.UserRemaining) , 'of', json.data.UserLimit, 'requests'
      console.log 'Requests will reset:', moment(json.data.UserReset*1000).toDate()
  .on 'error', (err) ->
    console.log 'error: ', err
  

if program.clientId  
  unless program.rateLimitCheck
    suck() 
  else
    checkRateLimit()

else
  console.log 'An imgur client id is required'
  program.help(_)

