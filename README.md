imgur-sucker
============

A command line utility for vacuuming a subreddit's images right off of imgur

**Install**

    npm install imgur-sucker

You can run this command from any location, but know it will create a */sucked/* folder in your current working directory
and will add subdirectories based on the subreddits that you pull. If logging is turned on, it will also create a json file with image vitals.

You will need an Imgur Application Client Id to run this app. To get a client ID: https://api.imgur.com/oauth2/addclient


Usage: imgursucker [options]

  Options:

    -h, --help                             output usage information
    -V, --version                          output the version number
    -c, --client-id <imgur App Client Id>  imgur client id
    -p, --pages <pages>                    number of pages to suck [10]
    -s, --subreddit <subreddit>            subreddit to suck [cats]
    -l, --logging <boolean>                log downloaded image data to json file [true]
    -d, --download <boolean>               download the files found [true]
    -r, --rate-limit-check                 check your current imgur credits to prevent rate limiting
    

Pretty much says what it does on the box. Tests have show that with 10 pages worth of sucking, you can acquire about **1750 unique images per subreddit**


