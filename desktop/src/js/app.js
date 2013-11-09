/*!
 * Pixel Art Scrapbook
 *
 * Copyright 2013 Steve Cochrane
 * Released under the MIT license
 * http://github.com/stevecochrane/pixel-art-scrapbook/
 *
 */

//  Most of this was picked up from the "Building an Ember.js Application" tutorial video,
//  so if you want to learn Ember, start here! http://emberjs.com/guides/

App = Ember.Application.create();

//  For the internals of the app, a "scrap" is one of the scrapbook images
//  and its associated meta info (just tags for now).

App.Router.map(function() {
    this.resource('scrap', { path: 'scrap/:scrap_id' });
    this.resource('search', { path: 'search/:search_term' });
    this.resource('upload');
});

//  For a production-quality app the following getJSON's would be locally stored using
//  Ember Data to eliminate unnecessary requests.

App.ApplicationRoute = Ember.Route.extend({
    model: function() {
        return scraps;
    }
});

App.IndexRoute = Ember.Route.extend({
    model: function() {
        return scraps;
    }
});

App.ScrapRoute = Ember.Route.extend({
    model: function(params) {
        return scraps.findBy('id', params.scrap_id);
    }
});

App.SearchRoute = Ember.Route.extend({
    model: function(params) {
        //  Uses regex to return any results that have even a partial match for the search term.
        //  Decode is needed here since if the user has clicked on a tag link or entered the URL manually,
        //  the search_term will have encoded spaces in it if the tag has more than one word.
        var regex = new RegExp(decodeURIComponent(params.search_term), 'i');
        return scraps.filter(function(currentScrap) {
            return regex.test(currentScrap.tags);
        });
    }
});

App.UploadRoute = Ember.Route.extend({
    model: function() {
        return scraps;
    }
});

App.SearchTextField = Ember.TextField.extend({
    //  Extend the search input so that it submits a search when the user presses enter/return
    //  Source for insertNewline: https://www.adobe.com/devnet/html5/articles/flame-on-a-beginners-guide-to-emberjs.html
    //  Source for sendAction and targetAction: http://jsfiddle.net/selvaG/xJZ6Y/5/
    insertNewline: function(){
        this.sendAction('targetAction', this.get('value').replace(/(<([^>]+)>)/ig, ''));
    }
});

App.DragAndDropView = Ember.View.extend({
    //  Drag and drop scripting is a combination of the following;
    //  Getting the FileList from a drag and drop: http://www.html5rocks.com/en/tutorials/file/dndfiles/
    //  Converting a file to base64: http://jsbin.com/ayazin/49/

    //  Generally, storing and serving all of the images for this app in base64 would be a bad idea
    //  since base64-encoded images are typically 33% larger. I just did it this way for this prototype
    //  since it was the fastest to implement.

    //  This will bind the elements class to the isDragActive variable on the view.
    //  If isDragActive is true, the class "drag-active" will be added. If false, the class is removed.
    classNameBindings: [':dnd-area', 'isDragActive:drag-active', 'hasImage:has-image'],
    isDragActive: false,
    hasImage: false,
    tagName: 'div',

    eventManager: Ember.Object.create({
        dragEnter: function(event, view) {
            event.stopPropagation();
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
    
            //  Set isDragActive to true to turn the drag and drop area green
            view.set('isDragActive', true);
        },
        dragLeave: function(event, view) {
            event.stopPropagation();
            event.preventDefault();
    
            //  Bring the drag and drop area's appearance back to normal.
            view.set('isDragActive', false);
        },
        dragOver: function(event, view) {
            //  Seems unnecessary but drag and drop won't work in Chrome and Firefox without preventing this event.
            event.stopPropagation();
            event.preventDefault();        
        },
        drop: function(event, view) {
            event.stopPropagation();
            event.preventDefault();

            //  Get the files that were just dragged and dropped.
            var files = event.dataTransfer.files; // FileList object.

            //  Remove green highlighting and remove "drag and drop here" text from the upload space
            view.set('isDragActive', false);
            view.set('hasImage', true);

            //  Let's try and create a new directory!
            //  Make a new Ti.Filesystem.File object for the root directory that will store the images
            var imagesDir = Ti.Filesystem.getFile(Ti.Filesystem.getDocumentsDirectory(), 'Pixel Art Scrapbook/Images');
            //  Create that directory if it doesn't already exist
            imagesDir.createDirectory();

            //  Now let's try to put the newly dropped file in there.
            //  Since the file they're importing already exists on the hard drive, and since I can get the file's 
            //  path by checking the (JavaScript) File object, it might be best to just copy it over.
            //  So, we make a new (TideSDK) File object with the path of file that was just dropped in.
            var droppedFile = Ti.Filesystem.getFile(event.dataTransfer.files[0].path);
            //  Then, we copy that file to the data directory.
            droppedFile.copy(imagesDir);

            //  Let's make a string with the path to this copied image
            droppedFilePath = 'file://localhost' + imagesDir.nativePath() + '/' + droppedFile.name();
            //  We'll need this path later once the Save button has been pressed, so we'll store that in
            //  a hidden <input> element for now.
            $('#img-data').val(droppedFilePath);

            //  Now that we've copied the image over, we can set up the preview to display the copied image.
            //  Get the preview container
            $('#' + view.get('elementId'))
                //  Empty its contents (in case there is already an image being previewed)
                .empty()
                //  Then, append a new preview of the image that was just dropped in
                .append('<img src="' + droppedFilePath + '">');
        }
    })
});

App.ApplicationController = Ember.ObjectController.extend({
    actions: {
        search: function(searchTerm) {
            //  Check if something has been entered into the search field.
            //  Ember returns the textfield object if there isn't a value, so instead of just "if (searchTerm)"
            //  we'll check if searchTerm is a string. If so, then something was entered, if not, it's empty.
            if (typeof searchTerm == 'string') {
                //  If so, go to the search view for the entered search term
                this.transitionToRoute('search', searchTerm);
            } else {
                //  If not, return to the index (otherwise it would return 0 results)
                this.transitionToRoute('index');
            }
        }
    },
});

App.ScrapController = Ember.ObjectController.extend({
    isEditing: false,
    tagsRollback: null,

    actions: {
        edit: function(scrap) {

            //  Store the current tags so that we can roll back to this state if necessary.
            tagsRollback = scrap.tags;
            this.set('isEditing', true);

        },
        save: function(scrap) {

            //  This one's easy: the scraps array is already updated by Ember, so all we have to do is...
            //  Update the local data.js file to reflect the change.
            //  It would also be nice to provide some sort of undo functionality!
            updateLocalJSON();

            //  Now that we're done, turn isEditing to false to get back to the non-edit state
            this.set('isEditing', false);

        },
        cancel: function(scrap) {

            //  Roll back to the previously stored rollback state to remove any changes that were made.
            Ember.set(scrap, 'tags', tagsRollback);
            this.set('isEditing', false);

        },
        remove: function(scrap) {

            //  Find the object in the scraps array with the matching ID and delete it.
            //  This is less efficient that it could be. Later it might be nice to see if 
            //  this could use just objects instead of an array, and if Ember supports that.
            //  For now we'll map some local variables, which is an easy speed increase.
            var fileToDelete,
                fileToDeleteName,
                fileToDeletePathSegments,
                scrapsLength = scraps.length,
                scrapId = scrap.id,
                i;

            //  Loop through every object in the scraps array
            for (i = 0; i < scrapsLength; i++) {
                //  Check if this scrap's ID matches that of the one the user selected to delete.
                if (scraps[i].id == scrapId) {
                    //  Match found!
                    //  First I'll need to get just the file name of the image we're about to delete.
                    //  A regular expression would probably be more efficient but I'm not sure how to yet.
                    fileToDeletePathSegments = scraps[i].img.split('/');
                    fileToDeleteName = fileToDeletePathSegments[fileToDeletePathSegments.length - 1];
                    //  And now we delete the actual file and hopefully not screw up anything else.
                    //  For some reason if I just plug in a string with the full file path (like scrap[i].img)
                    //  TideSDK has issues and can't delete the file, but this way works.
                    fileToDelete = Ti.Filesystem.getFile(Ti.Filesystem.getDocumentsDirectory() + '/Pixel Art Scrapbook/Images', fileToDeleteName);
                    fileToDelete.deleteFile();
                    //  Now that that's out of the way, we can remove it from the array too.
                    scraps.splice(i, 1);
                    //  And now that we've done what we need we can stop iterating through the loop.
                    break;
                }
            }

            //  Update the local data.js file to reflect the change.
            //  It would also be nice to provide some sort of undo functionality!
            updateLocalJSON();

            //  Now we're done, redirect back to the index view.
            this.transitionToRoute('index');

        }
    }
});

App.UploadController = Ember.ObjectController.extend({
    actions: {
        add: function(scrap) {

            //  Apply the hidden image location that we stored in the drop event in App.DragAndDropView
            //  You can't just use scrap.img = [whatever] here or Ember will throw an error.
            //  In order to set a property to an arbitrary value like this, you need to use Ember.set().
            Ember.set(scrap, 'img', $('#img-data').val());

            //  Make a new object for the new image and add it to the data array.
            scraps.push({
                //  Increment the currentMaxID and then use that for this new object, as a String.
                "id": ++currentMaxID + '',
                "img": scrap.img,
                "tags": scrap.tags.replace(/(<([^>]+)>)/ig, '')
            });

            //  Update the local data.js file to reflect the change.
            updateLocalJSON();

            //  Now we're done, redirect back to the index view.
            this.transitionToRoute('index');

        },
        cancel: function() {
            this.transitionToRoute('index');
        }
    }
});

Ember.Handlebars.helper('sanitize', function(value, options) {
    return value.replace(/(<([^>]+)>)/ig, '');
});

//  Two helpers combined, since as far as I know you can only use one helper at a time.
Ember.Handlebars.helper('sanitizeAndWrapLinks', function(value, options) {
    var valueModified, valueArray, valueArrayLength;
    //  First, sanitize the provided value to remove any HTML.
    valueModified = value.replace(/(<([^>]+)>)/ig, '');
    //  If there are spaces after commas, remove them. 
    //  This will still preserve spaces between tag names.
    //  Ex. "tag one, tag two, tag three" becomes "tag one,tag two,tag three"
    valueModified = valueModified.replace(/, /g, ',');
    //  Then use split to create a new array of the listed tags.
    valueArray = valueModified.split(',');
    //  Then loop through each entry in the array and wrap each one in an anchor element.
    //  These links will point to a search query for the tag.
    //  This is maybe a little hacky since the ideal way to generate the href would be to 
    //  work within Ember's routes rather than hard-code '#/search/' into the URL.
    valueArrayLength = valueArray.length;
    for (var i = 0; i < valueArrayLength; i += 1) {
        valueArray[i] = '<a href="#/search/' + encodeURIComponent(valueArray[i]) + '">' + valueArray[i] + '</a>';
        //  Add a comma and space after each one unless we're on the last tag, to separate the links.
        if (i < valueArrayLength - 1) {
            valueArray[i] += ', ';
        }
    }
    //  Then join the array back into a string.
    valueModified = valueArray.join('');
    //  Finally, return the result as a safe string so the HTML is preserved.
    return new Handlebars.SafeString(valueModified);
});


//  Here's where we grab the local database file and get its data array ready for use.
//  Ajax won't work because you can't use Ajax on 'file://' or 'localhost' due to security restrictions.
//  So we'll have to use TideSDK to open a filestream and read the contents that way.
//  First, get a TideSDK file object reference to the actual file.
var dataJsonFile = Ti.Filesystem.getFile(Ti.Filesystem.getDocumentsDirectory() + '/Pixel Art Scrapbook/Data', 'data.js');
//  Make a FileStream of the File and open it so we can read the contents.
var dataJsonFileStream = Ti.Filesystem.getFileStream(dataJsonFile);
dataJsonFileStream.open(Ti.Filesystem.MODE_READ);
//  Get the data we need by grabbing all of the bytes from the FileStream.
var dataJsonBytes = dataJsonFileStream.read(dataJsonFile.size());
//  We're done reading from the FileStream so we'll close it here.
dataJsonFileStream.close();
//  Now we'll convert the bytes to something we can use. First, convert the bytes to a String,
//  then we can use JSON.parse to convert that String to a JSON object.
var dataJson = JSON.parse(dataJsonBytes.toString());
//  All done, here's the final array that Ember will use for the interface.
var scraps = dataJson.scraps;
//  And here is the currentMaxID, which we'll use to make sure each object has a unique ID.
var currentMaxID = dataJson.currentMaxID;

//  When a change is made to the data (add/edit/delete) then call this function to update the local JSON file.
//  This is pretty basic for now (read: not especially efficient) and all it does is
//  overwrite the local JSON with an up-to-date-copy of the scraps object.
function updateLocalJSON() {
    dataJsonFileStream.open(Ti.Filesystem.MODE_WRITE);
    dataJsonFileStream.write('{"currentMaxID":' + currentMaxID + ',"scraps":' + JSON.stringify(scraps) + '}');
    dataJsonFileStream.close();
}