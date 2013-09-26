/*  The following is mostly from this tutorial:
    http://coenraets.org/blog/2012/10/creating-a-rest-api-using-node-js-express-and-mongodb/
*/

var mongo = require('mongodb');

var Server = mongo.Server,
    Db = mongo.Db,
    BSON = mongo.BSONPure;

var server = new Server('localhost', 27017, {auto_reconnect: true});
db = new Db('scrapdb', server);

db.open(function(err, db) {
    if(!err) {
        console.log("Connected to 'scrapdb' database");
        db.collection('scraps', {strict:true}, function(err, collection) {
            if (err) {
                console.log("The 'scraps' collection doesn't exist. Creating it with sample data...");
                populateDB();
            }
        });
    }
});

exports.findById = function(req, res) {
    var id = req.params.id;
    console.log('Retrieving scrap: ' + id);
    db.collection('scraps', function(err, collection) {
        collection.findOne({'_id':new BSON.ObjectID(id)}, function(err, item) {
            res.send(item);
        });
    });
};

exports.findAll = function(req, res) {
    db.collection('scraps', function(err, collection) {
        collection.find().toArray(function(err, items) {
            res.send(items);
        });
    });
};

exports.addScrap = function(req, res) {
    var scrap = req.body;
    console.log('Adding scrap: ' + JSON.stringify(scrap));
    db.collection('scraps', function(err, collection) {
        collection.insert(scrap, {safe:true}, function(err, result) {
            if (err) {
                res.send({'error':'An error has occurred'});
            } else {
                console.log('Success: ' + JSON.stringify(result[0]));
                res.send(result[0]);
            }
        });
    });
}

exports.updateScrap = function(req, res) {
    var id = req.params.id;
    var scrap = req.body;
    console.log('Updating scrap: ' + id);
    console.log(JSON.stringify(scrap));
    db.collection('scraps', function(err, collection) {
        collection.update({'_id':new BSON.ObjectID(id)}, scrap, {safe:true}, function(err, result) {
            if (err) {
                console.log('Error updating scrap: ' + err);
                res.send({'error':'An error has occurred'});
            } else {
                console.log('' + result + ' document(s) updated');
                res.send(scrap);
            }
        });
    });
}
 
exports.deleteScrap = function(req, res) {
    var id = req.params.id;
    console.log('Deleting scrap: ' + id);
    db.collection('scraps', function(err, collection) {
        collection.remove({'_id':new BSON.ObjectID(id)}, {safe:true}, function(err, result) {
            if (err) {
                res.send({'error':'An error has occurred - ' + err});
            } else {
                console.log('' + result + ' document(s) deleted');
                res.send(req.body);
            }
        });
    });
}

//  The following uses code from here:
//  http://www.aleccumming.com/2012/01/23/search-with-mongodb-nodejs-and-express/
exports.search = function(req, res) {
    var term = req.params.term;
    var regex = new RegExp(term, "i");
    db.collection('scraps', function(err, collection) {
        collection.find({ 'tags': regex }).toArray(function(err, items) {
            res.send(items);
        });
    });
};
 
/*--------------------------------------------------------------------------------------------------------------------*/
// Populate database with sample data -- Only used once: the first time the application is started.
// You'd typically not find this code in a real-life app, since the database would already exist.
var populateDB = function() {

    var scraps = [{
        "img": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAADwAQAAAADH7IdmAAAA0UlEQVR4Ae3RsYrCQBDG8VmEpEvabJVH2VeJTXo7C0k2TSxt9W0Mwt1rXDi4Pp0B3XVPbGe2ELkDv1/9h9mZJXhbAAAAAADQWgoKYvlIoCw9HeTjPLqi4YN0uk6+8MRxpD/1cOgsuybpXndCoLbzb+D5YBcL9vcRlsRg4APl8zBCWFO5NASPQ0Xu/WdBXPIfgmZtOldaPmg35cmZIx+sPqjOqooPlj3ViRyUP0n7JQUmFlRhBMlBJgfmO6wpPnIMh3rxhywuJFNnYgEAAAAAAMAN8XpQ4fGd4VAAAAAASUVORK5CYII=",
        "tags": "sample image"
    }];
 
    db.collection('scraps', function(err, collection) {
        collection.insert(scraps, {safe:true}, function(err, result) {});
    });
 
};