
const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const { json } = require('express/lib/response');
const app = express();
const server = require("http").createServer(app);
const wss = new WebSocket.Server({server:server})
var cookies = require("cookie-parser");
app.use(cookies());
app.use(express.static(__dirname+'/static'));


let port = process.env.PORT || 5000;
let phase = "attack";
let whoseTurn = 1;
let target = [0,0];
let serverId = Math.random()*10000
let wordSet = false;


let numOfPlayers = 0;
let clients = []

class player {
    constructor(name, number, ws, id){
        this.name = name;
        this.ws = ws;
        this.number = number;
        this.points = 0;
        this.id=id;
    }

    giveLetter(letter, position){
        points--;
        this.ws.send(JSON.stringify({"letter":letter, "position":position}))
        updatePoints()
    }

    updatePoints(){
        this.ws.send(JSON.stringify())
    }

    addPoints(points){
        this.points+=points
    }

    rename(name){
        this.name=name;
    }

}
let players = []
let guessword = "apple";
let timeRunning=false;
let time = 60;

wss.on('connection',function connection(ws){
	
    let alreadyThere = false;
    players.forEach(function(player){if(player.id==numOfPlayers)alreadyThere=true;});
    if(!alreadyThere){
        players.push(new player("player "+numOfPlayers,numOfPlayers, ws, numOfPlayers))
    }
    clients.push(ws)

    sendPlayerlist()
    
    ws.send(JSON.stringify({"time":time,"timeRunning":timeRunning}))
    
    ws.on('message',function incoming(message){
        
        answer = JSON.parse(message);

        if(answer["word1"] && answer["word2"] && answer["word3"] && answer["id"]!=0){ 
            if(whoseTurn == answer["id"] && !timeRunning){
                guessword = answer["word3"]        
                broadcast({"word1":answer["word1"],"word2":answer["word2"],})
                timeRunning=true;
                broadcast({"timeRunning":timeRunning, "time":time,})
                wordSet = true;
            }
        }

        if(answer["tipWord"] && answer["id"]){
            if (answer["tipWord"]==guessword && whoseTurn != answer["id"]){
                if(time>=30){
                    getPlayerByID(whoseTurn).addPoints(3);
                }
                winRound(answer["id"]);
            }
        }

        if(answer["rename"] && answer["id"]){
            getPlayerByID(answer["id"]).rename(answer["rename"]);
            sendPlayerlist();
        }

    })
});

let getPlayerByID = function(id){
    let res=null
    players.forEach(function(player){if(player.id==id)res=player});
    return res
}

let winRound = function(winnerID){
    wordSet=false;
    word1="xxx";
    word2="xxx";
    guessword=null;
    timeRunning=false;
    broadcast({"word1":answer["word1"],"word2":answer["word2"], "time":time,"timeRunning":false})
    whoseTurn=(whoseTurn)%(players.length)+1;
    getPlayerByID(winnerID).addPoints(5);
    sendPlayerlist();
}

let broadcast = function(jsonmessage){
    for(let i =0;i<clients.length;i++){
        clients[i].send(JSON.stringify(jsonmessage))
    }
}

let sendPlayerlist = function(){
    let playerNames = []
    players.forEach(function (player){
        playerNames.push([player.name, player.points, player.id])
    });
    broadcast({"playernames":playerNames})
}

app.get('/',(req, res) =>{
       
    if(req.cookies["id"+serverId] == undefined ){
        numOfPlayers++;
        res.cookie("run","id"+serverId,{maxAge: 1000 * 60 * 150,})
        res.cookie("id"+serverId,numOfPlayers,{maxAge: 1000 * 60 * 150,})
    }
    res.sendFile(path.join(__dirname, './index.html'))
        
});
server.listen( port, () => console.log( "listening on port 5000" ))

setInterval(function(){
    if(timeRunning)time-=1;
},1000);
