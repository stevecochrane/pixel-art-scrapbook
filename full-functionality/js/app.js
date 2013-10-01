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
        return $.getJSON('http://localhost:1337/scraps');
    }
});

App.IndexRoute = Ember.Route.extend({
    model: function() {
        return $.getJSON('http://localhost:1337/scraps');
    }
});

App.ScrapRoute = Ember.Route.extend({
    model: function(params) {
        return $.getJSON('http://localhost:1337/scraps/' + params.scrap_id);
    }
});

App.SearchRoute = Ember.Route.extend({
    model: function(params) {
        return $.getJSON('http://localhost:1337/search/' + params.search_term);
    }
});

App.UploadRoute = Ember.Route.extend({
    model: function() {
        return $.getJSON('http://localhost:1337/scraps');
    }
});

App.SearchTextField = Ember.TextField.extend({
    //  Extend the search input so that it submits a search when the user presses enter/return
    //  Source for insertNewline: https://www.adobe.com/devnet/html5/articles/flame-on-a-beginners-guide-to-emberjs.html
    //  Source for sendAction and targetAction: http://jsfiddle.net/selvaG/xJZ6Y/5/
    insertNewline: function(){
        this.sendAction('targetAction', this.get('value'));
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
    
            var files = event.dataTransfer.files, // FileList object.
                FR = new FileReader();
    
            FR.onload = function(frEvent) {
                //  frEvent.target.result is the image that was just dragged and dropped, encoded in base64.
                //  Now that we have the encoded image we'll store it in a hidden input element, #img-data,
                //  for use later when the form is submitted.
                $('#img-data').val(frEvent.target.result);
                //  Now we'll add the image that was dropped to the page so it can be previewed.
                //  First, select this view's element with jQuery
                $('#' + view.get('elementId'))
                    //  Empty its contents (in case there is already an image being previewed)
                    .empty()
                    //  Then, append a new preview of the image that was just dropped in.
                    .append('<img src="' + frEvent.target.result + '">')
                //  Finally, set isDragActive to false to remove the green highlighting and set hasImage to true 
                //  to add some styles for when there is an image inside.
                view.set('isDragActive', false);
                view.set('hasImage', true);
            };
            FR.readAsDataURL(files[0]);
        }
    })
});

App.ApplicationController = Ember.ObjectController.extend({
    actions: {
        search: function(searchTerm) {
            //  Check if something has been entered into the search field.
            //  Ember returns the textfield object if there isn't a value, so instead of just "if (searchTerm)"
            //  we'll check if searchTerm is a string. If so, then something was entered, if not, it's empty.
            if (typeof searchTerm == "string") {
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
            this.set('isEditing', true);
            tagsRollback = scrap.tags;
        },
        save: function(scrap) {
            this.set('isEditing', false);
            $.ajax({
                type: 'PUT',
                url: 'http://localhost:1337/scraps/' + scrap._id,
                dataType: 'JSON',
                data: {
                    img: scrap.img,
                    tags: scrap.tags
                }
            });
        },
        cancel: function(scrap) {
            this.set('isEditing', false);
            Ember.set(scrap, 'tags', tagsRollback);
        },
        remove: function(scrap) {
            var objController = this;
            $.ajax({
                type: 'DELETE',
                url: 'http://localhost:1337/scraps/' + scrap._id,
                success: function() {
                    objController.transitionToRoute('index');
                }
            });
        }
    }
});

App.UploadController = Ember.ObjectController.extend({
    actions: {
        add: function(scrap) {

            var objController = this;
            //  Apply the hidden encoded image value
            scrap.img = $('#img-data').val();

            $.ajax({
                type: 'POST',
                url: 'http://localhost:1337/scraps/',
                dataType: 'JSON',
                data: {
                    img: scrap.img,
                    tags: scrap.tags
                },
                success: function() {
                    objController.transitionToRoute('index');
                }
    
            });

        },
        cancel: function() {
            this.transitionToRoute('index');
        }
    }
});