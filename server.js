const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path')
const PORT = process.env.PORT || 5000
const axios = require('axios');
const { createProxyMiddleware } = require('http-proxy-middleware');


const app = express();
app.use(cors());
app.use(bodyParser.json());
app.set('port', (process.env.PORT || 5000));

app.use((req, res, next) => 
{
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PATCH, DELETE, OPTIONS'
  );
  next();
});


// Database
require('dotenv').config();
const url = process.env.MONGODB_URI;
const MongoClient = require("mongodb").MongoClient;
const client = new MongoClient(url);
client.connect(console.log("mongodb connected"));


exports = async function(changeEvent) {
    var docId = changeEvent.fullDocument._id;
    
    const counterdb = context.services.get("Cluster0").db(changeEvent.ns.db).collection("counters");
    const usersdb = context.services.get("Cluster0").db(changeEvent.ns.db).collection(changeEvent.ns.coll);
    
    var counter = await counterdb.findOneAndUpdate({_id: changeEvent.ns },{ $inc: { seq_value: 1 }}, { returnNewDocument: true, upsert : true});
    var updateRes = await usersdb.updateOne({_id : docId},{ $set : {id : counter.seq_value}});
    
    console.log(`Updated ${JSON.stringify(changeEvent.ns)} with counter ${counter.seq_value} result : ${JSON.stringify(updateRes)}`);
};
///////////////////////////////////////////////////
// For Heroku deployment

// Server static assets if in production
if (process.env.NODE_ENV === 'production') 
{
  // Set static folder
  app.use(express.static('frontend/build'));

  app.get('*', (req, res) => 
 {
    res.sendFile(path.resolve(__dirname, 'frontend', 'build', 'index.html'));
  });
}


// REGISTER API
app.post('/api/register', async (req, res, next) => 
{
	// incoming: username, password, firstname, lastname, email, phone
	// outgoing: message, error
  
	var error = '';
	var message = 'User has been registered';
	var saved_parks = [];
  
	const { username, password, firstname, lastname, email, phone } = req.body;
  
	const db = client.db("COP4331_Group22");
  
	try{
	  // Check if user exists
	  const userExists = await db.collection('Users').findOne({ username: username });
	  if (userExists) {
		error = 'Username already exists';
	  }else{
		const id = await db.collection('Users').countDocuments() + 1;
  
		// inserts the new user
		await db.collection('Users').insertOne({id: id, username: username, password: password, firstname: firstname, lastname: lastname, email: email, phone: phone, saved_parks: saved_parks });
	  }
	}catch(e){
	  // Handle other errors
	  error = e.toString();
	}
  
	var ret = { message: message, error: error };
	res.status(200).json(ret);
});

//LOGIN API
app.post('/api/login', async (req, res, next) =>
{
	// incoming: username, password
	// outgoing: id, firstname, lastname, saved_parks, error

	var error = '';

	const { username,password } = req.body;

	const db = client.db("COP4331_Group22");
	const results = await db.collection('Users').find({username:username,password:password}).toArray();

	var id = -1;
	var fname = '';
	var lname = '';
	var parks = [];

	if(results.length > 0)
	{
		id = results[0].id
		fname = results[0].firstname
		lname = results[0].lastname
		parks = results[0].saved_parks
	}

	var ret = { id:id, firstname:fname, lastname:lname, saved_parks:parks, error:error };
	res.status(200).json(ret);
	
});

//DELETE USER API - if we wanted to have the ability for a user to cancel their account
app.post('/api/deleteUser', async (req, res, next) =>
{
	// incoming: username
	// outgoing: message, error

	var error = '';
	var message = 'User has been deleted';

	//deletes with username - should have different usernames (change register if needed later)
	const { username } = req.body;

	const db = client.db("COP4331_Group22");

	try{
		db.collection('Users').deleteOne({ username:username });
	}
	catch(e){
		error = e.toString();
	}

	var ret = { message:message, error:error };
	res.status(200).json(ret);
});

//UPDATE USER API - might not need but just in case (not including saved_parks)
app.post('/api/updateUser', async (req, res, next) =>
{
	// incoming: username, password, firstname, lastname, email, phone
	// outgoing: message, error

	var error = '';
	var message = 'User has been updated';

	const { username, password, firstname, lastname, email, phone } = req.body;

	const db = client.db("COP4331_Group22");

	// searches by username (every user should have different usernames) and updates every field in Users
	try{
		db.collection('Users').updateOne({username:username}, {$set: { password:password, firstname:firstname, lastname:lastname, email:email, phone:phone }});
	}
	catch(e){
		error = e.toString();
	}

	var ret = { message:message,error:error };
	res.status(200).json(ret);
});


// SEARCH USER API - Searches for users 
app.post('/api/searchUser', async (req, res, next) => 
{
	// incoming: userId, search
	// outgoing: results[], error

	var error = '';

	const { userId, search } = req.body;

	var _search = search.trim();
  
	const db = client.db('COP4331_Group22');
	const results = await db.collection('Users').find({"username":{$regex:_search+'.*', $options:'i'}}).toArray();
  
	var _ret = [];
	for( var i=0; i<results.length; i++ )
	{
		_ret.push( results[i].username );
	}
  
  	var ret = {results:_ret, error:error};
  	res.status(200).json(ret);
});

// GET PASSWORD API - returns username, password, and email
app.post('/api/password', async (req, res, next) => 
{
	// incoming: username
	// outgoing: username, password, email

	var error = '';
	
	const { username } = req.body;

	const db = client.db("COP4331_Group22");
	const results = await db.collection('Users').find({username:username}).toArray();
  
	var password = '';
	var email = '';

	if(results.length > 0)
	{
		password = results[0].password
		email = results[0].email
	}
  
  	var ret = { username:username,password:password,email:email,error:error};
  	res.status(200).json(ret);
	
});

//UPDATE PASSWORD API
app.post('/api/updatePassword', async (req, res, next) =>
{
	// incoming: username, password
	// outgoing: message, error

	var error = '';
	var message = 'Password has been updated';

	const { username, password } = req.body;

	const db = client.db("COP4331_Group22");

	// searches by username (every user should have different usernames) and updates every field in Users
	try{
		db.collection('Users').updateOne({username:username}, {$set: { password:password }});
	}
	catch(e){
		error = e.toString();
	}

	var ret = { message:message,error:error };
	res.status(200).json(ret);
});

// ADD TRIP API - Adds a trip
app.post('/api/addTrip', async (req, res, next) =>
{
	// incoming: name, startDate, endDate, userID
	// outgoing: message, error

	var error = '';
	var message = 'Trip has been added';
	var rides = [];

	const { name,startDate,endDate,userID,parkID } = req.body;

	const db = client.db('COP4331_Group22');

	db.collection('Trips').countDocuments().then(tripID =>
        {
            tripID++;
            //check if trip exists
	        try{
				var sdate = new Date(startDate);
				var edate = new Date(endDate);

		        db.collection('Trips').insertOne( { tripID:tripID,name:name,startDate:sdate,endDate:edate,userID:userID,parkID:parkID,rides:rides });
	        }
	        catch(e)
	        {
			// trip already exists
			error = e.toString();
	        }
        });
	
	var ret = { message:message,error:error };
	res.status(200).json(ret);
});

// DELETE TRIP API - deletes a trip
app.post('/api/deleteTrip', async (req, res, next) =>
{
	// incoming: userId, name
	// outgoing: message, error

	var error = '';
	var message = 'Trip has been deleted';

	//deletes with name - should have different trip names
	const { userID, name } = req.body;

	const db = client.db("COP4331_Group22");

	try{
		db.collection('Trips').deleteOne({ userID:userID, name:name });
	}
	catch(e){
		error = e.toString();
	}

	var ret = { message:message, error:error };
	res.status(200).json(ret);
});

// SEARCH TRIP API - searches for a trip by name
app.post('/api/searchTrip', async (req, res, next) =>
{
	// incoming: userID, search
	// outgoing: results[], error

	var error = '';

	const { userID, search } = req.body;
	
	var _search = search.trim();
	  
	const db = client.db('COP4331_Group22');
	const results = await db.collection('Trips').find({"name":{$regex:_search+'.*', $options:'i'}, "userID":userID}).toArray();
	  
	var _ret = [];
	for( var i=0; i<results.length; i++ )
	{
		_ret.push( results[i].name );
		_ret.push( results[i].tripID );
		_ret.push( results[i].parkID );
		_ret.push( results[i].rides );
	}
	  
	var ret = {results:_ret, error:error};
	res.status(200).json(ret);
});

// UPDATE TRIP API - updates a trip
app.post('/api/updateTrip', async (req, res, next) =>
{
	// incoming: tripID, name, startDate, endDate
	// outgoing: message, error

	var error = '';
	var message = 'Trip has been updated';

	const { tripID, name, startDate, endDate } = req.body;

	const db = client.db("COP4331_Group22");

	// searches by id and updates every field in Trips
	try
	{
		var sdate = new Date(startDate);
		var edate = new Date(endDate);

		db.collection('Trips').updateOne({tripID:tripID}, {$set: { name:name, startDate:sdate, endDate:edate }});
	}
	catch(e){
		error = e.toString();
	}

	var ret = { message:message,error:error };
	res.status(200).json(ret);
});

// ADD PARK API - adds a park to Users saved_parks array
app.post('/api/addPark', async (req, res, next) =>
{
	// incoming: userID, parkID
	// outgoing: message, error

	var error = '';
	var message = "Park has been added to user's saved_parks";

	const { userID,parkID } = req.body;

	const db = client.db('COP4331_Group22');

	try
	{
		db.collection('Users').updateOne({id:userID}, {$push: {saved_parks:parkID}});
	}
	catch(e)
	{
		error = e.toString();
	}

	var ret = { message:message,error:error };
	res.status(200).json(ret);
});

//DELETE PARK API - deletes a park from User's saved_parks array
app.post('/api/deletePark', async (req, res, next) =>
{
	// incoming: userID, parkID
	// outgoing: message, error

	var error = '';
	var message = "Park has been deleted from user's saved parks";

	const { userID,parkID } = req.body;

	const db = client.db('COP4331_Group22');

	try
	{
		db.collection('Users').updateOne({id:userID}, {$pull: {saved_parks:parkID}});
	}
	catch(e)
	{
		error = e.toString();
	}

	var ret = { message:message,error:error };
	res.status(200).json(ret);
});

// SEARCH PARK API - searches for a park by name
app.post('/api/searchPark', async (req, res, next) => 
{
	// incoming: userId, search
	// outgoing: results[], error

	var error = '';

	const { userId, search } = req.body;

	var _search = search.trim();
  
	const db = client.db('COP4331_Group22');
	const results = await db.collection('Parks').find({"name":{$regex:_search+'.*', $options:'i'}}).toArray();
  
	var _ret = [];
	for( var i=0; i<results.length; i++ )
	{
		_ret.push( results[i].name );
	}
  
  	var ret = {results:_ret, error:error};
  	res.status(200).json(ret);
});

// ADD RIDE API - adds a ride to a trip's rides array
app.post('/api/addRide', async (req, res, next) =>
{
	// incoming: tripID, rideID
	// outgoing: message, error

	var error = '';
	var message = "Ride has been added to trip's rides[]";

	const { tripID,rideID } = req.body;

	const db = client.db('COP4331_Group22');

	try
	{
		db.collection('Trips').updateOne({tripID:tripID}, {$push: {rides:rideID}});
	}
	catch(e)
	{
		error = e.toString();
	}

	var ret = { message:message,error:error };
	res.status(200).json(ret);
});

// DELETE RIDE API - deletes ride from a trip's rides array
app.post('/api/deleteRide', async (req, res, next) =>
{
	// incoming: tripID, rideID
	// outgoing: message, error

	var error = '';
	var message = "Ride has been deleted from trip's rides[]";

	const { tripID,rideID } = req.body;

	const db = client.db('COP4331_Group22');

	try
	{
		db.collection('Trips').updateOne({tripID:tripID}, {$pull: {rides:rideID}});
	}
	catch(e)
	{
		error = e.toString();
	}

	var ret = { message:message,error:error };
	res.status(200).json(ret);
});


// SEARCH RIDE API - searches for a ride by name
app.post('/api/searchRide', async (req, res, next) =>
{
	// incoming: userID, search
	// outgoing: results[], error

	var error = '';

	const { userID, search } = req.body;
	
	var _search = search.trim();
	  
	const db = client.db('COP4331_Group22');
	const results = await db.collection('Rides').find({"name":{$regex:_search+'.*', $options:'i'}}).toArray();
	  
	var _ret = [];
	for( var i=0; i<results.length; i++ )
	{
		_ret.push( results[i].name );
	}
	  
	var ret = {results:_ret, error:error};
	res.status(200).json(ret);
});

// app.get('/api/parks', async (req, res) => {
// 	try {
// 	  const response = await fetch('https://queue-times.com/parks.json');
// 	  if (!response.ok) {
// 		throw new Error('Error fetching parks');
// 	  }
// 	  const data = await response.json();
// 	  res.setHeader('Content-Type', 'application/json');
// 	  res.json(data);
// 	} catch (error) {
// 	  console.error(error);
// 	  res.status(500).json({ error: 'Internal Server Error' });
// 	}
//   });

app.post('/api/parks', async (req, res) => {
	// incoming: 
	// outgoing: results[], error

    try 
	{
        const response = await axios.get(`https://queue-times.com/parks.json`);
        res.json(response.data);
    } 
	catch (error) 
	{
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
  

app.post('/api/rides', async (req, res) => {
	// incoming: parkID
	// outgoing: results[], error
	const {parkID} = req.body;

    try 
	{
        const response = await axios.get(`https://queue-times.com/parks/${parkID}/queue_times.json`);
        res.json(response.data);
    } 
	catch (error) 
	{
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/averageWaitTime', async (req, res) => {
	//incoming: park id, ride id
	//outgoing: avg wait time
	const {parkID, rideID} = req.query;

	try{
		const response = await axios.get(`https://queue-times.com/parks/${parkID}/rides/${rideID}/average_histogram.json`);
		res.json(response.data);
	} catch (error){
		console.error(error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

app.listen(PORT, () =>{
	console.log('Server is running on port ' + PORT);
});
