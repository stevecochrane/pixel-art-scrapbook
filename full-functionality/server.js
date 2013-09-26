var express = require('express'),
    scraps = require('./routes/scraps');
 
var app = express();
 
app.configure(function () {
    app.use(express.logger('dev')); /* 'default', 'short', 'tiny', 'dev' */
    app.use(express.bodyParser());
});
 
app.get('/scraps', scraps.findAll);
app.get('/scraps/:id', scraps.findById);
app.post('/scraps', scraps.addScrap);
app.put('/scraps/:id', scraps.updateScrap);
app.delete('/scraps/:id', scraps.deleteScrap);

app.get('/search/:term', scraps.search);
 
app.listen(1337);
console.log('Listening on port 1337...');
