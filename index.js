const accountSid = require('./secrets').sid;
const authToken = require('./secrets').token;
var fs = require('fs')
var getPixels = require("get-pixels")
const jsQR = require('jsqr')

let words = [
    "able",
    "acid",
    "aged",
    "also",
    "area",
    "army",
    "away",
    "baby",
    "back",
    "ball",
    "band",
    "bank",
    "base",
    "bath",
    "bear",
    "beat",
    "been",
    "beer",
    "bell",
    "belt",
    "best",
    "bill",
    "bird",
    "blow",
    "blue",
    "boat",
    "body",
    "bomb",
    "bond",
    "bone",
    "book",
    "boom",
    "born",
    "boss",
    "both",
    "bowl",
    "bulk",
    "burn",
    "bush",
    "busy",
    "call",
    "calm",
    "came",
    "camp",
    "card",
    "care",
    "case",
    "cash",
    "cast",
    "cell",
    "chat",
    "chip",
    "city",
    "club",
    "coal",
    "coat",
    "code",
    "cold",
    "come",
    "cook",
    "cool",
    "cope",
    "copy",
    "CORE",
    "cost",
    "crew",
    "crop",
    "dark",
    "data",
    "date",
    "dawn",
    "days",
    "dead",
    "deal",
    "dean",
    "dear",
    "debt",
    "deep",
    "deny",
    "desk",
    "dial",
    "diet",
    "disc",
    "disk",
    "does",
    "done",
    "door",
    "dose",
    "down",
    "draw",
    "drew",
    "drop",
    "drug",
    "dual",
    "duke",
    "dust",
    "duty",
    "each",
    "earn",
    "ease",
    "east",
    "easy",
    "edge",
    "else",
    "even",
    "ever",
    "evil",
    "exit",
    "face",
    "fact",
    "fail",
    "fair",
    "fall",
    "farm",
    "fast",
    "fate",
    "fear",
    "feed",
    "feel",
    "feet",
    "fell",
    "felt",
    "file",
    "fill",
    "film",
    "find",
    "fine",
    "fire",
    "firm",
    "fish",
    "five",
    "flat",
    "flow",
    "food",
    "foot",
    "ford",
    "form",
    "fort",
    "four",
    "free",
    "from",
    "fuel",
    "full",
    "fund",
    "gain",
    "game",
    "gate",
    "gave",
    "gear",
    "gene",
    "gift",
    "girl",
    "give",
    "glad",
    "goal",
    "goes",
    "gold",
    "Golf",
    "gone",
    "good",
    "gray",
    "grew",
    "grey",
    "grow",
    "gulf",
    "hair",
    "half",
    "hall",
    "hand",
    "hang",
    "hard",
    "harm",
    "hate",
    "have",
    "head",
    "hear",
    "heat",
    "held",
    "hell",
    "help",
    "here",
    "hero",
    "high",
    "hill",
    "hire",
    "hold",
    "hole",
    "holy",
    "home",
    "hope",
    "host",
    "hour",
    "huge",
    "hung",
    "hunt",
    "hurt",
    "idea",
    "inch",
    "into",
    "iron",
    "item",
    "jack",
    "jane",
    "jean",
    "john",
    "join",
    "jump",
    "jury",
    "just",
    "keen",
    "keep",
    "kent",
    "kept",
    "kick",
    "kill",
    "kind",
    "king",
    "knee",
    "knew",
    "know",
    "lack",
    "lady",
    "laid",
    "lake",
    "land",
    "lane",
    "last",
    "late",
    "lead",
    "left",
    'jamsheed'
]

var GoogleUrl = require('google-url')
 
var googl = new GoogleUrl( { key: require('./secrets').google });


var bodyParser = require('body-parser');

// require the Twilio module and create a REST client
const client = require('twilio')(accountSid, authToken);

var http = require('http');
var express = require('express');
var twilio = require('twilio');

var app = express();

app.use(bodyParser.urlencoded({extended: false}));

let accounts = {}
accounts = require('./storage.json')

let queue = []

let pairs = []

app.post('/sms', function(req, res) {
    let command = req.body.Body
    let cmdFound = false

    Object.keys(commands).forEach(cmd => {
        if (command.toUpperCase().includes(cmd)) {
            commands[cmd](req, res)
            cmdFound = true
        }
    })

    if (!Object.keys(accounts).includes(req.body.From)) {
        accounts[req.body.From] = {
            nameSupplied: false
        }
    }

    if (req.body['MediaUrl0']) {
        cmdFound = true
        console.log(req.body['MediaUrl0'])

        if ( accounts[req.body.From].nextMMSUsedFor == 'self' ) {
            // scan qr code
            accounts[req.body.From].imageUrl = req.body['MediaUrl0']

            fs.writeFile( "storage.json", JSON.stringify( accounts ), "utf8" , () => {})

            var twiml = new twilio.twiml.MessagingResponse();
            twiml.message('You\'re ready! Type QUEUE to find a partner');
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(twiml.toString());
        }
    }

    if (!cmdFound && !accounts[req.body.From].nameSupplied) { // if a command is not found, it is assumed they are entering their name
        console.log(command)
        accounts[req.body.From].name = command 
        accounts[req.body.From].nameSupplied = true
        accounts[req.body.From].nextMMSUsedFor = 'self'

        fs.writeFile( "storage.json", JSON.stringify( accounts ), "utf8" , () => {})

        var twiml = new twilio.twiml.MessagingResponse();
        twiml.message('Now upload a picture of yourself :) not creepy at all - please use a real picture or else you break the whole game');
        res.writeHead(200, {'Content-Type': 'text/xml'});
        res.end(twiml.toString());
    } else {
        if (!cmdFound) {
            if (!isValidKeyword(req.body.From, command)) {
                // either wrong keyword or mistyped command
                var twiml = new twilio.twiml.MessagingResponse();
                twiml.message('command not found');
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end(twiml.toString());
            } else {

                if (accounts[req.body.From].points) {
                    accounts[req.body.From].points++
                } else {
                    accounts[req.body.From].points = 1
                }

                var twiml = new twilio.twiml.MessagingResponse();
                twiml.message('+1 point - You have ' + accounts[req.body.From].points + ' points.  Type QUEUE to play again' )
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end(twiml.toString());

                fs.writeFile( "storage.json", JSON.stringify( accounts ), "utf8" , () => {})
            }
        }
    }

    console.log(accounts)
});

http.createServer(app).listen(80, function () {
  console.log("Express server listening on port 80");
});

const commands = {
    'START': (req, res) => {
        if (!(accounts[req.body.From] && accounts[req.body.From].name && accounts[req.body.From].imageUrl))
        {
            console.log(req.To + ' texted to start')

            var twiml = new twilio.twiml.MessagingResponse();
            twiml.message('Welcome to the LAH 2018 Wild Dev Chase!  Respond with your full name.');
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(twiml.toString());
        } else {
            var twiml = new twilio.twiml.MessagingResponse();
            twiml.message('You are already intitialized');
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(twiml.toString());
        }
    },
    'QUEUE': (req, res) => {
        const num = req.body.From

        if ((accounts[req.body.From] && accounts[req.body.From].name && accounts[req.body.From].imageUrl)) {
            if (!queue.includes(num)) {
                queue.push(num)
    
                console.log('queue at queue command', queue)

                var twiml = new twilio.twiml.MessagingResponse();
                twiml.message('You are in the queue');
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end(twiml.toString());
    
                checkQueue()
            } else {
                var twiml = new twilio.twiml.MessagingResponse();
                twiml.message('You already in a queue');
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end(twiml.toString());
            }
        } else {
            var twiml = new twilio.twiml.MessagingResponse();
                twiml.message('Please type START first');
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end(twiml.toString());
        }
    },
    'CLEAR': (req, res) => {
        const num = req.body.From

        if ((accounts[req.body.From] && accounts[req.body.From].name && accounts[req.body.From].imageUrl)) {
            delete accounts[num]
            
            pairs = pairs.filter(p => !p.pair.includes(num))

            queue = queue.filter(item => item != num)
        }

        var twiml = new twilio.twiml.MessagingResponse();
                twiml.message('You\'ve been cleared from the db');
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end(twiml.toString());

                fs.writeFile( "storage.json", JSON.stringify( accounts ), "utf8" , () => {})
    }
}

function checkQueue() {
    if (queue.length >= 2) {
        console.log('queue at check', queue)

        console.log(queue[0])
        console.log(queue[1])

        let one = queue[0]
        let two = queue[1]

        let wordOne = words[Math.floor(Math.random() * Math.floor(words.length))]
        let wordTwo = words[Math.floor(Math.random() * Math.floor(words.length))]

        const pair = {pair: [one, two], keywords: { [one]: wordOne,[two]: wordTwo } }

        pairs.push(pair)

        // googl.shorten( accounts[one].imageUrl, function( err, shortUrl ) {
        //     client.messages
        //     .create({
        //         to: one,
        //         from: require('./secrets').phone,
        //         body: 'Match found... ' + shortUrl + ' - Your keyword is ' + pair.keywords[one].toUpperCase(),
        //     })
        // } )

        // googl.shorten( accounts[two].imageUrl, function( err, shortUrl ) {
        //     client.messages
        //     .create({
        //         to: two,
        //         from: require('./secrets').phone,
        //         body: 'Match found... ' + shortUrl + ' - Your keyword is ' + pair.keywords[two].toUpperCase(),
        //     })
        // } )

        shortenUrl(accounts[two].imageUrl).then(shortened => {
            console.log("First url shortened")
            messageClient(one, 'Match found... image" ' + shortened + ' - Your keyword is ' + pair.keywords[one].toUpperCase() + ' - find the person in this picture & tell them your keyword')
        }).then(() => {
            console.log("First client messaged")
            return shortenUrl(accounts[one].imageUrl)
        }).then(shortened => {
            console.log("We have shorterned the second url")
            return messageClient(two, 'Match found... image" ' + shortened + ' - Your keyword is ' + pair.keywords[two].toUpperCase() + ' - find the person in this picture & tell them your keyword')
        }).then(() => {
            console.log("second client messaged")
            console.log(pairs)

            queue = queue.slice(2)
    
            console.log('queue after clearing', queue)
        })
    }
}

function isValidKeyword(num, keyword) {
    let res = false
    pairs.forEach(p => { // beautiful code :)
        if (p.pair.includes(num)) {
            p.pair.forEach(pNum => {
                if(pNum !== num) {
                    // p.keywords[pNum] = KEY1
                    // keyword = key1   
                    if(keyword.toUpperCase().includes(p.keywords[pNum].toUpperCase())) {
                        res = true
                    }
                }
            })
        }
    })

    return res
}

function shortenUrl(long) {
    return new Promise((resolve, reject) => {
        googl.shorten( long, function( err, shortUrl ) {
            resolve(shortUrl)
        })
    })
}

function messageClient(to, content) {
    return new Promise((resolve, reject) => {
        client.messages
        .create({
            to: to,
            from: require('./secrets').phone,
            body: content,
        }).then(message => resolve());
    })
}