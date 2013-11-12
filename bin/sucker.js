#!/usr/bin/env node
(function() {
  var ProgressBar, checkRateLimit, fs, getImagesFromSubreddit, http, https, moment, program, suck, _;

  program = require('commander');

  ProgressBar = require('progress');

  https = require('https');

  http = require('http');

  fs = require('fs');

  _ = require('lodash');

  moment = require('moment');

  program.version('0.0.1').option('-c, --client-id <imgur App Client Id>', 'imgur client id').option('-p, --pages <pages>', 'number of pages to suck [10]', Number, 10).option('-s, --subreddit <subreddit>', 'subreddit to suck [cats]', 'cats').option('-l, --logging <boolean>', 'log downloaded image data to json file [true]', true).option('-d, --download <boolean>', 'download the files found [true]', 'true').option('-r, --rate-limit-check', 'check your current imgur credits to prevent rate limiting').parse(process.argv);

  suck = function() {
    var apiDay, apiLatest, apiMonth, apiWeek, apiYear, bar, data, i, idList, options, pageURL, pages, pagesDone, startPage, subredditName, urls;
    subredditName = program.subreddit;
    console.log("processsing: " + subredditName);
    pages = program.pages;
    startPage = 0;
    pageURL = "";
    pagesDone = 0;
    apiYear = "/3/gallery/r/" + subredditName + "/top/year/";
    apiMonth = "/3/gallery/r/" + subredditName + "/top/month/";
    apiWeek = "/3/gallery/r/" + subredditName + "/top/week/";
    apiDay = "/3/gallery/r/" + subredditName + "/top/day/";
    apiLatest = "/3/gallery/r/" + subredditName + "/time/";
    urls = new Array();
    options = null;
    data = new Array();
    idList = new Array();
    i = startPage;
    while (i < startPage + pages) {
      urls.push(apiYear + i);
      urls.push(apiMonth + i);
      urls.push(apiWeek + i);
      urls.push(apiDay + i);
      urls.push(apiLatest + i);
      i++;
    }
    bar = new ProgressBar('scanning [:bar] :percent :etas', {
      total: urls.length,
      width: 100
    });
    return urls.forEach(function(pageURL) {
      options = {
        hostname: "api.imgur.com",
        path: pageURL,
        headers: {
          Authorization: "Client-ID " + program.clientId
        },
        method: "GET"
      };
      return https.get(options, function(res) {
        var doc;
        doc = "";
        res.on("data", function(chunk) {
          return doc += chunk;
        });
        return res.on("end", function() {
          var imageArray, json, spliceCount;
          json = JSON.parse(doc);
          spliceCount = 0;
          imageArray = new Array();
          bar.tick();
          if (json.data.length > 0) {
            json.data.forEach(function(image, index, array) {
              var ext;
              if (idList.indexOf(image.id) === -1) {
                idList.push(image.id);
                ext = image.link.match(/\.\w+$/);
                image.link = image.link.replace(/\.\w+$/, "l" + ext).replace(/http:\/\/i.imgur.com\//g, "");
                return imageArray.push(image);
              }
            });
            data.push.apply(data, imageArray);
          }
          if (++pagesDone === pages * 5) {
            if (data.length > 0) {
              console.log("Images Found: " + data.length);
              return getImagesFromSubreddit(subredditName, data);
            }
          }
        });
      }).on("error", function(e) {
        return console.log("HTTPS Load Error: " + e.message);
      });
    });
  };

  getImagesFromSubreddit = function(subreddit, imageList) {
    var bar, imagesComplete, originalList, percent, totalImages;
    originalList = _.clone(imageList, true);
    imagesComplete = 1;
    totalImages = imageList.length;
    percent = 0;
    console.log('Total Images Found:', totalImages);
    bar = new ProgressBar('downloading [:bar] :current/:total images | :etas remaining', {
      total: totalImages,
      width: 100,
      callback: function() {
        console.log('\nSucking Complete');
        if (program.logging) {
          fs.writeFile(process.cwd() + "/sucked/" + subreddit + "/_" + subreddit + ".js", 'module.exports = ' + JSON.stringify(originalList, null, 4), 'utf8', function(err) {
            if (err) {
              throw err;
            }
            return console.log("_" + subreddit + ".js written to images/" + subreddit + " directory");
          });
          return console.log('You now have', totalImages, subreddit, 'pictures');
        }
      }
    });
    if (!fs.existsSync(process.cwd() + '/sucked')) {
      fs.mkdirSync(process.cwd() + '/sucked');
    }
    return fs.exists(process.cwd() + "/sucked/" + subreddit, function(dirExists) {
      if (!dirExists) {
        fs.mkdirSync(process.cwd() + "/sucked/" + subreddit);
      }
      return imageList.forEach(function(image, index, array) {
        var filename;
        filename = image.link;
        return fs.exists(process.cwd() + "/sucked/" + subreddit + "/" + filename, function(exists) {
          var e, imageRequest;
          if (!exists) {
            try {
              return imageRequest = http.get("http://i.imgur.com/" + image.link, function(imageResults) {
                var imagedata;
                imagedata = "";
                imageResults.setEncoding("binary");
                imageResults.on("data", function(chunk) {
                  return imagedata += chunk;
                });
                return imageResults.on("end", function() {
                  bar.tick();
                  return fs.writeFile(process.cwd() + "/sucked/" + subreddit + "/" + filename, imagedata, "binary", function(err) {
                    if (err) {
                      console.log("ERROR WRITING FILE: " + err);
                      throw err;
                    }
                  });
                });
              });
            } catch (_error) {
              e = _error;
              return console.log("ERROR GETTING IMAGE: " + e);
            }
          } else {
            return bar.tick();
          }
        });
      });
    });
  };

  checkRateLimit = function() {
    var options;
    options = {
      hostname: "api.imgur.com",
      path: '/3/credits',
      headers: {
        Authorization: "Client-ID " + program.clientId
      },
      method: "GET"
    };
    return https.get(options, function(res) {
      var doc;
      doc = "";
      res.on("data", function(chunk) {
        return doc += chunk;
      });
      return res.on("end", function() {
        var json;
        json = JSON.parse(doc);
        console.log('Used:', json.data.UserLimit - json.data.UserRemaining, 'of', json.data.UserLimit, 'requests');
        return console.log('Requests will reset:', moment(json.data.UserReset * 1000).toDate());
      });
    }).on('error', function(err) {
      return console.log('error: ', err);
    });
  };

  if (program.clientId) {
    if (!program.rateLimitCheck) {
      suck();
    } else {
      checkRateLimit();
    }
  } else {
    console.log('An imgur client id is required');
    program.help(_);
  }

}).call(this);
