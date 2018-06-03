var express = require('express');
var exphbs = require('express-handlebars');
var path = require('path');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var url = require('url');
var redis = require('redis');

var redisURL = url.parse(process.env.REDISCLOUD_URL);
var client = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});
var rateLimiter = require('express-rate-limit');

var RedisStore = require('rate-limit-redis');
var cache = require('express-redis-cache')({expire:60});
var session = require('express-session');


client.on('connect',function(){
	console.log('connected to redis');
});

client.publish('paramter','kamal you beauty!');

//set port 
const port = 3004;

var app = express();

app.use(session({secret:'haveTo'}));

var limiter = new rateLimiter({
	store: new RedisStore({
    // see Configuration
  }),
	max:10,
	delayMs :1,
	message: "Too many accounts created from this IP, please try again after an hour"
});

app.engine('handlebars',exphbs({defaultLayout:'main'}));
app.set('view engine','handlebars');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
app.use(limiter);
app.use(methodOverride('_method'));

app.get('/',function(req,res,next){console.log('adsfds');
	cache.route('home');
	cache.on('message',function(message){
		console.log(message);
	});
	//res.render('searchusers');
	res.render('login');
});

app.post('/user/search',function(req,res,next){
	let id=req.body.id;
	//id = "user"+id;	
	var userCount =undefined;	
	savePerDayUserCount('search');
	userStats('user/search',function(userCount){	
		client.hgetall(id,function(err,obj){
			if(!obj){
				res.render('searchusers',{
					error:'User does not exist',
					user:userCount
				});
			}else{
				obj.id = id;
				obj.count = userCount;
				
				res.render('details',{
					user:obj				
				});
			}
		});
	});
});

app.get('/users/add',function(req,res,next){	
	var userCount = undefined;
	var email = req.session.email;
	console.log(email);
	userStats('users/add',function(userCount){
		res.render('addusers',{user:userCount});	
	});
	
});

app.get('/users/list',function(req,res,next){
	var id = "title";
	var userCount = undefined;
	userStats('users/list',function(userCount){
		client.keys("*title*",function(err,keys){
		if(err) return console.log(err);
		
			var totalLength = keys.length;
			var data = [];
			for(var i=1;i<=totalLength;i++){
				var fetchId = "title:"+i;
				client.hgetall(fetchId,function(err,obj){
					if(!obj){
			
					}else{	
						data.push(obj);
					}
				});		
			}
			data.count = userCount;		
			res.render('listusers',{user:data});
		});	
	});
	
	//res.render('addusers');
});

app.post('/users/add',function(req,res,next){
	if(req.session.email && req.session.password){
		var userCount = undefined;
		userStats('users/add',function(userCount){
			let id = req.body.id;
			var newid = "title:"+id;
			let first_name = req.body.first_name;
			let last_name = req.body.last_name;
			let email = req.body.email;
			let phone = req.body.phone;
			client.hmset(newid, [
				'first_name',first_name,
				'last_name',last_name,
				'email',email,
				'phone',phone
				],function(err,reply){
					if(err){
						console.log(err);
					}
					
					res.redirect('/');
				});
		});	
	}else{
		res.render('logout');
	}
	
	
});

app.post('/users/register',function(req,res,next){
	var userCount = undefined;
	userStats('users/add',function(userCount){		
		console.log(req.body);
		let first_name = req.body.first_name;
		let last_name = req.body.last_name;
		let email = req.body.email;
		let password = req.body.password;
		var newid = "signup:email";
		client.hmset(newid, [
			'first_name',first_name,
			'last_name',last_name,
			'email',email,
			'password',password
			],function(err,reply){
				if(err){
					console.log(err);
				}
				req.session.first_name=first_name;
				req.session.last_name = last_name;
				req.session.email=email;
				req.session.password = password;
				res.render('searchusers');
			});
	});
	
});

app.get('/users/pagecount',function(req,res){
	var today = new Date();
	var dd = today.getDate();
	var mm = today.getMonth()+1;
	var yy = today.getFullYear();
	var fullPath = 'user:'+dd+mm+yy+':*';

});

app.delete('/user/delete/:id',function(req,res,next){

	let id = req.params.id;
	client.del(id);
	res.redirect('/');
});

app.listen(port,function(){
	console.log('server started');
});


function userStats(pagePath,callback){	
	client.incr(pagePath);	
	client.get(pagePath,function(err,obj){
		userCount = obj;	
		callback(userCount);
	});
}

function savePerDayUserCount(pagePath){
	var today = new Date();
	var dd = today.getDate();
	var mm = today.getMonth()+1;
	var yy = today.getFullYear();
	var fullPath = 'user:'+dd+mm+yy+':'+pagePath;
	console.log(fullPath);
	client.incr(fullPath);
}

