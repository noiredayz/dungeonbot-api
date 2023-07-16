import http from "http";
import process from "process";
import { MongoClient } from "mongodb";

const ptl = console.log;

const wsPort = 7776;
const mongoServerAddress = "mongodb://127.0.0.1:27017";

ptl("dungeonbot website starting up");
try{
	http.createServer(requestHandler).listen(wsPort, '127.0.0.1');
}
catch(err){
	console.error(`Fatál error while trying to create the http service: `+err);
	process.exit(1);
}

const mc = new MongoClient(mongoServerAddress);
let db;
try{
	await mc.connect();
	db = mc.db("Twitch");
}
catch(err){
	console.error(`Fatál error while trying to connect to mongoDB: `+err);
	process.exit(1);
}
ptl("Connected to the database at "+mongoServerAddress);
process.on("exit", ()=>{ if(mc) mc.close();});

async function requestHandler(req, res){
	ptl(`<http> Incoming request for "${req.url}"`);
	let inurl = req.url.split("?");
	let data, parm;
	switch(inurl[0]){
		case "/index.htm":
		case "/index.html":
		case "/":
			res.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'});
			res.write("server online");
			res.end();
			break;
		case "/leaderboard":
			data = await db.collection("UserStats").find({total_experience: {$ne: 0}, leaderboardExclude: 0}).sort({ total_experience: -1}).limit(20).toArray();
			res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
			res.write(JSON.stringify(data));
			res.end();
			break;
		case "/channels":
			data = await db.collection("Channels").find().project({name: 1}).toArray();
			data.sort((a, b)=>{if(a.name>b.name) return 1; if(a.name<b.name) return -1; if(a.name===b.name) return 0;});
			res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
			res.write(JSON.stringify(data));
			res.end();
			break;
		case "/users":
			if(inurl.length<2){
				res.writeHead(400, {'Content-Type': 'application/json; charset=utf-8'});
				res.write(JSON.stringify({status: "errored", msg: "invalid call, use /users?id=twitchID or /users?name=username"}));
				res.end();
				break;
			}
			parm = inurl[1].split("=");
			if(parm.length<2 || (parm[0]!="id" && parm[0]!="name")){
				res.writeHead(400, {'Content-Type': 'application/json; charset=utf-8'});
				res.write(JSON.stringify({status: "errored", msg: "invalid call, use /users?id=twitchID or /users?name=username"}));
				res.end();
				break;
			}
			if(parm[0]==="id"){
				if(isNaN(parm[1])){
					res.writeHead(400, {'Content-Type': 'application/json; charset=utf-8'});
					res.write(JSON.stringify({status: "errored", msg: "invalid call, identifier must be a number"}));
					res.end();
					break;
				} else {
					data = await db.collection("UserStats").findOne({ _id: parm[1]});
					res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
					res.write(JSON.stringify(data));
					res.end();
				}
			}
			if(parm[0]==="name"){
				if(!validateTwitchUsername(parm[1])){
					res.writeHead(400, {'Content-Type': 'application/json; charset=utf-8'});
					res.write(JSON.stringify({status: "errored", msg: "invalid call, supplied name is not a valid Twitch username"}));
					res.end();
					break;
				} else {
					data = await db.collection("UserStats").findOne({username: {$regex: new RegExp("\\b"+parm[1]+"\\b", "i") }});
					res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
					res.write(JSON.stringify(data));
					res.end();
				}
			}
			break;
		case "/teapot":
			res.writeHead(418, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache'});
			res.write(JSON.stringify({status: "teapot", message: "🆗 🥚 🍵 ⏲ "}));
			res.end();
			break;
		default:
			res.writeHead(404, {'Content-Type': 'text/plain'});
			res.write("404 - Content not found");
			res.end();
			break;
	}
}

function validateTwitchUsername(unick){
	if(typeof(unick) != "string") return false;	//numbers only is valid, but it must still be a string!
	if(unick.length<3 || unick.length>25) return false;
	const utest = /^[a-zA-Z0-9][\w]{2,25}$/; // credits to https://discuss.dev.twitch.tv/u/Freddy
	return utest.test(unick);
}

