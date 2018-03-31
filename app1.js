var express = require('express');
var redis = require('redis');
var client = redis.createClient();

client.on('connect',function(){
	console.log('connected to redis');
});

const port = 3005;
var app = express();
client.on('message',function(channel,message){
	try{
		const t = message;
		console.log(t);
	} catch(e){

	}
});

app.listen(port,function(){
	console.log('server started');
});

client.subscribe('paramter');