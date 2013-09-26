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

    dragEnter: function(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.

        //  A bit of a hack since I couldn't figure out in time how to change classes the Ember way.
        $('#dnd-area').addClass('drag-active');
    },
    dragLeave: function(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        $('#dnd-area').removeClass('drag-active');
    },
    dragOver: function(evt) {
        //  Seems unnecessary but drag and drop won't work in Chrome and Firefox without preventing this event.
        evt.stopPropagation();
        evt.preventDefault();        
    },
    drop: function(evt) {
        evt.stopPropagation();
        evt.preventDefault();

        var files = evt.dataTransfer.files, // FileList object.
            FR = new FileReader(),
            imgEncoded,
            $dndArea = $('#dnd-area');

        FR.onload = function(e) {
            imgEncoded = e.target.result;
            //  Now we have the encoded image, so we'll store it in an invisible input
            //  until the form is submitted. This is a bit of a hack for now and it would be better 
            //  to do it the Ember way. Maybe next time.
            $('#img-data').val(imgEncoded);
            //  First, if they've already dropped an image, remove it.
            $dndArea.find('img').remove();
            //  Now remove the active class and add the image to the page.
            $dndArea
                .removeClass('drag-active')
                .addClass('has-image')
                .append('<img src="' + imgEncoded + '">');
        };
        FR.readAsDataURL(files[0]);

    },
    tagName: 'div'
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

    actions: {
        edit: function() {
            this.set('isEditing', true);
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
        cancel: function() {
            this.set('isEditing', false);
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