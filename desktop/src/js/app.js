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

    //  This will bind the elements class to the isDragActive variable on the view.
    //  If isDragActive is true, the class "drag-active" will be added. If false, the class is removed.
    classNameBindings: [':dnd-area', 'isDragActive:drag-active', 'hasImage:has-image'],
    isDragActive: false,
    hasImage: false,
    tagName: 'div',

    //  In Windows the event.dataTransfer.effectAllowed property is read-only and set to "none", which means 
    //  drag and drop isn't allowed and there's no way to change that. This isn't always the case, but in the 
    //  out-of-date verson of WebKit that TideSDK uses it is. Fortunately there is a way around this 
    //  with the mouseOver event, but Ember doesn't support mouseOver in its eventManager object, but
    //  fortunately again, Ember *does* support the mouseEnter event, and that also works in this case.
    //  Adding further to the complications here, I would have liked to fork by feature and handle things the 
    //  ideal way with actual drag and drop events in OS X, but when you add the drop, dragOver, and dragLeave 
    //  events and cancel their defaults (which is necessary to make it work) then Windows decides to put a 
    //  'not supported' (red circle with line over it) icon over the file, which would make it look like drag 
    //  and drop was not supported even though it is. And that's the story of the following code.

    //  Credit for the mouseOver drag and drop method goes to "si test":
    //  http://developer.appcelerator.com/question/117783/file-drag-and-drop-in-titanium-desktop#answer-238794

    acceptDrop: false,
    acceptFile: false,

    eventManager: Ember.Object.create({
        dragEnter: function(event, view) {
            event.stopPropagation();
            event.preventDefault();

            //  We're starting a drop, set the flag to true so mouseEnter can process the drop.
            view.set('acceptDrop', true);
            //  Store a reference to the file that the user is about to drop.
            view.set('acceptFile', event.dataTransfer.files[0]);
            //  Remove the error state if it's currently there.
            $('.dnd-area').removeClass('error');
            //  Set isDragActive to true to turn the drag and drop area green.
            view.set('isDragActive', true);
        },
        mouseOut: function(event, view) {
            event.stopPropagation();
            event.preventDefault();

            //  Cancel the drop since the file has left the drop zone.
            view.set('acceptDrop', false);
            view.set('acceptFile', false);
        },
        mouseEnter: function(event, view) {
            event.stopPropagation();
            event.preventDefault();

            //  Normally when you move the mouse over the drag and drop area this event fires right away,
            //  but if you are dragging a file it will fire the event as soon as you drop the file.
            //  We'll check acceptDrop to know which case it is and only proceed if there is a file.
            if (view.get('acceptDrop')) {
                view.set('acceptDrop', false);
                //  Remove green highlighting and remove "drag and drop here" text from the upload space
                view.set('isDragActive', false);
                view.set('hasImage', true);

                //  Now let's process the image file that was just dropped in.
                //  We'll want to preview the image on the page, so we'll need access to it, but we also 
                //  shouldn't save it to the hard drive yet since they haven't saved the new scrap yet.
                //  So, we'll make a new (TideSDK) File object with the path of the file that was dropped in,
                //  and we'll save it to a temporary directory for now. If the user saves changes, we'll 
                //  copy this over to the real images directory later. If the user decides not to use this 
                //  and cancels, this image and any others in the temp directory will be deleted on quit.
                droppedFile = Ti.Filesystem.getFile(view.get('acceptFile').path);
                droppedFile.copy(tempImagesDir);

                //  Now we can store a string with the full path to the image.
                droppedFilePath = 'file://localhost' + tempImagesDir.nativePath() + '/' + droppedFile.name();

                //  Now that we've copied the image over, we can set up the preview to display the copied image.
                //  Get the preview container
                $('#' + view.get('elementId'))
                    //  Empty its contents (in case there is already an image being previewed)
                    .empty()
                    //  Then, append a new preview of the image that was just dropped in
                    .append('<img src="' + droppedFilePath + '">');

                //  Empty out acceptFile for next time.
                view.set('acceptFile', false);
            }
        }
    })
});

App.ApplicationController = Ember.ObjectController.extend({

    //  This is called whenever currentPath is changed, that is to say, when the user enters a new page,
    //  and we'll call scrollToTopOfPage() to ensure the user always starts at the top.
    updateCurrentPath: function() {
        scrollToTopOfPage();
    }.observes('currentPath'),

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

    //  When the user clicks the edit button it reveals new form controls and expands the height 
    //  of the page. Normally, if the app window isn't tall enough to show everything, the user 
    //  would then have to scroll down to see the rest. To prevent this we'll run a function that 
    //  scrolls down to the bottom of the page automatically when the Edit button is pressed.
    isEditingDidChange: function() {
        //  Proceed if the user has just clicked Edit, otherwise (if the clicked Cancel) do nothing.
        if (this.isEditing) {
            //  Use scheduleOnce, or this will be executed immediately, and since the template hasn't 
            //  changed yet the change in height would not be detected. As seen here:
            //  http://stackoverflow.com/a/19228800
            Ember.run.scheduleOnce('afterRender', this, function() {
                scrollToBottomOfPage();
            });
        }
    }.observes('isEditing'),

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
                    fileToDeletePathSegments = scraps[i].location.split('/');
                    fileToDeleteName = fileToDeletePathSegments[fileToDeletePathSegments.length - 1];
                    //  And now we delete the actual file and hopefully not screw up anything else.
                    //  For some reason if I just plug in a string with the full file path (like scrap[i].location)
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

            //  First check if droppedFile has something, to tell if an image has been dropped in.
            //  Having an image dropped in is required so we'll make an error state if this is false.
            if (!droppedFile) {
                //  The user has not dropped in an image yet.
                //  All we need to do then is add the error state to the drag and drop area.
                $('.dnd-area').addClass('error');

            } else {
                //  The user has dropped in an image, so all required fields are specified.
                //  Proceed with storing the new image.

                //  Now we'll copy the image to the real images directory so it's stored permanently...
                droppedFile.copy(imagesDir);
                //  ...And we'll update droppedFilePath to match the new, permanent location...
                droppedFilePath = 'file://localhost' + imagesDir.nativePath() + '/' + droppedFile.name();
                //  ...And finally we'll add the image location to the model so it can be stored.
                //  Note that you can't just use scrap.location = [whatever] here or Ember will throw an error.
                //  In order to set a property to an arbitrary value like this, you need to use Ember.set().
                Ember.set(scrap, 'location', droppedFilePath);
    
                //  Now that we're done with them for this image, reset droppedFile and droppedFilePath.
                //  Otherwise if an image isn't dropped in the next time a scrap is added, the scrap
                //  would add this previous image by mistake.
                droppedFile = undefined;
                droppedFilePath = undefined;
    
                //  Now check if any tags have been provided. Tags are optional, but if they're left blank
                //  we'll need to make sure we pass along an empty string, not undefined.            
                if (!Ember.get(scrap, 'tags')) {
                    Ember.set(scrap, 'tags', '');
                }
    
                //  Make a new object for the new image and add it to the data array.
                scraps.push({
                    //  Increment the currentMaxID and then use that for this new object, as a String.
                    "id": ++currentMaxID + '',
                    "location": scrap.location,
                    "tags": scrap.tags.replace(/(<([^>]+)>)/ig, ''),
                    //  Also, get the current date to store as Date Added for the new image.
                    //  This will be stored as a UTC string, which is easy to convert back to a JS Date object later.
                    "dateAdded": (new Date()).toUTCString()
                });
    
                //  Update the local data.js file to reflect the change.
                updateLocalJSON();
    
                //  Now we're done, redirect back to the index view.
                this.transitionToRoute('index');
            }

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

//  This takes a UTC string and displays it as "Month Day, Year"
Ember.Handlebars.helper('formatDate', function(value, options) {
    //  In the case that there isn't a date value yet (like when a new image is being added)
    //  just use the current date.
    var dateObj = value ? new Date(value) : new Date();
    //  JavaScript's Date object returns a number for the month so here is an array to look up the string equivalent.
    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return monthNames[dateObj.getMonth()] + " " + dateObj.getDate() + ", " + dateObj.getFullYear();
});

//  Handy pluralize function, found here:
//  http://there4development.com/blog/2012/07/29/handlebars-helpers-for-debugging-and-pluralization/
//  Usage: {{pluralize collection.length 'quiz' 'quizzes'}}
Ember.Handlebars.helper('pluralize', function(number, single, plural) {
    return (number === 1) ? single : plural;
});

//  FILE SYSTEM INITIALIZATION!
//  This has a bunch of global variables for now but it'll be in an official function soon.

//  First we'll make the directory structure. If the directories are already there, these do nothing.
var appDir = Ti.Filesystem.getFile(Ti.Filesystem.getDocumentsDirectory() + '/Pixel Art Scrapbook');
appDir.createDirectory();
var imagesDir = Ti.Filesystem.getFile(appDir.nativePath() + '/Images');
imagesDir.createDirectory();
var dataDir = Ti.Filesystem.getFile(appDir.nativePath() + '/Data');
dataDir.createDirectory();

//  Here's where we grab the local database file and get its data array ready for use.
//  Ajax won't work because you can't use Ajax on 'file://' or 'localhost' due to security restrictions.
//  So we'll have to use TideSDK to open a filestream and read the contents that way.
//  First, get a TideSDK file object reference to the actual file.
var dataJsonFile = Ti.Filesystem.getFile(dataDir.nativePath() + '/data.js');
//  Then make a reference to the contents of the file.
var dataJsonFileStream = Ti.Filesystem.getFileStream(dataJsonFile);
//  If the file doesn't exist yet, or if it does exist but its contents are empty,
//  then make the file and initialize it with an empty JSON object.
if (!dataJsonFile.exists() || !dataJsonFile.size()) {
    dataJsonFileStream.open(Ti.Filesystem.MODE_WRITE);
    dataJsonFileStream.write('{"currentMaxID":0,"scraps":[]}');
    dataJsonFileStream.close();
}
//  Now open the stream in read mode so we can read the contents.
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

//  And here's another variable that we'll need to reference in a couple places, so it's pulled out in scope here.
//  It's a cache we'll use for newly-uploaded images so that we can preview them without actually putting them 
//  on the hard drive until they're saved, using a temporary file.
var tempImagesDir = Ti.Filesystem.createTempDirectory();
//  Finally, declare the last dropped file and its path as globals for wider access.
var droppedFile, droppedFilePath;

//  When a change is made to the data (add/edit/delete) then call this function to update the local JSON file.
//  This is pretty basic for now (read: not especially efficient) and all it does is
//  overwrite the local JSON with an up-to-date-copy of the scraps object.
function updateLocalJSON() {
    dataJsonFileStream.open(Ti.Filesystem.MODE_WRITE);
    dataJsonFileStream.write('{"currentMaxID":' + currentMaxID + ',"scraps":' + JSON.stringify(scraps) + '}');
    dataJsonFileStream.close();
}

//  More messy global variables to be cleaned up later, this time for scroll assistance.
var $scrollContainer;

$(function() {
    $scrollContainer = $('.container').first();
});

function scrollToTopOfPage() {
    if ($scrollContainer) {
        $scrollContainer.scrollTop(0);
    }
}
function scrollToBottomOfPage() {
    if ($scrollContainer) {
        $scrollContainer.scrollTop($scrollContainer.prop('scrollHeight'));
    }
}