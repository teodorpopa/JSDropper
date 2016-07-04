(function($) {

    $.Dropper = function(element, options) {

        // default settings
        var defaults = {
            dragItemType: 'li',
            itemsFrameContent: '.items-frame',
            dropFrameContent: '.drop-frame',
            parentFrame: '.parent-frame',
            dragItemsFrame: '#dragItemsFrame',
            dropZoneFrame: '#dropZoneFrame',
            dropZone: '#dropZone',
            parentDragItem: '.item'
        };

        // messaging actions
        var actions = {
            start: 'start',
            move: 'move',
            cancel: 'cancel',
            drop: 'drop',
            stop: 'stop'
        };

        // final plugin settings
        this.settings = {};

        // notation so we don't mix this and that :)
        var plugin = this;

        // element currently dragging
        var dragElement;

        // check if a drag action is started or not
        var dragStarted;

        // the parent frame item to move along with the cursor
        var dragItem;

        // the id of the dragged element
        var dragItemId;

        // the content of the dragged element
        var dragItemContent;

        // this pretty much does all the work
        this.init = function() {

            // merge plugin default options with custom ones
            plugin.settings = $.extend({}, defaults, options);

            // add event handlers
            this.addHandlers();

            // watch the items frame
            this.watchItems();

            // watch the parent frame
            this.watchParent();

            // watch the drop frame
            this.watchDrop();

        };

        this.addHandlers = function() {
            // add event handler for items frame
            $(plugin.settings.itemsFrameContent).each( function () {
                window.addEventListener('message', function (e) {
                    plugin.dragEventHandler(e);
                }, false);
            });

            // add event handler for drop frame
            $(plugin.settings.dropFrameContent).each( function () {
                window.addEventListener('message', function (e) {
                    plugin.dropEventHandler(e);
                }, false);
            });

            // add event handler for parent frame
            $(plugin.settings.parentFrame).each( function () {
                window.addEventListener('message', function (e) {
                    plugin.parentEventHandler(e);
                }, false);
            });

        };

        /**
         * Watch the items frame for mouse events:
         * - mousedown: set the current dragging element and stop default behaviour
         * - mousemove: send the action data message to the parent frame, along with the cursor position
         * - mouseup: the the cancel data message to the parent frame
         */
        this.watchItems = function() {

            $.each($(plugin.settings.itemsFrameContent), function () {

                // if the user clicks on an element
                // block the default behaviour
                $(plugin.settings.dragItemType).mousedown(function (event) {
                    // set the current element
                    dragElement = $(this);

                    // block default behavior. save the bubbles :)
                    if(event.stopPropagation) event.stopPropagation();
                    //if(event.preventDefault) event.preventDefault();
                    event.cancelBubble = true;

                    return false;
                });

                // when the user moves the cursor, send the appropriate message to the parent frame
                $(document).mousemove(function (event) {
                    if (dragElement) {
                        if (!dragStarted) {

                            // if the dragging is not started
                            // send the start message
                            parent.postMessage({
                                action: actions.start,
                                frame: plugin.settings.dragItemsFrame,
                                item: {
                                    id: dragElement.attr('id'),
                                    content: dragElement.html()
                                },
                                position: {
                                    left: event.pageX,
                                    top: event.pageY
                                }
                            }, '*');

                            // reset flag value
                            dragStarted = true;
                        } else {

                            // if there is a dragging in place
                            // send the move message
                            parent.postMessage({
                                action: actions.move,
                                frame: plugin.settings.dragItemsFrame,
                                position: {
                                    left: event.pageX,
                                    top: event.pageY
                                }
                            }, '*');
                        }
                    }
                });

                // when the user releases the mouse
                $(document).mouseup(function (event) {
                    if (dragStarted) {

                        // and we have a dragging in place
                        // send the cancel message
                        parent.postMessage({
                            action: actions.cancel,
                            frame: plugin.settings.dragItemsFrame,
                            item: {
                                id: dragElement.attr('id'),
                                content: dragElement.html()
                            },
                            position: {
                                left: event.pageX,
                                top: event.pageY
                            }
                        }, '*');
                    }

                    // reset the flags
                    dragStarted = false;
                    dragElement = null;
                });

            });
        };

        /**
         * Watch the parent frame for events
         */
        this.watchParent = function() {

            // init frames
            var dragFrame = $(plugin.settings.dragItemsFrame);
            var dropFrame = $(plugin.settings.dropZoneFrame);

            $.each($(plugin.settings.parentFrame), function () {

                // when moving the cursor, set the offset to the item where the cursor is
                $(document).mousemove(function (event) {
                    if (dragItem) {
                        dragItem.offset({
                            left: event.pageX,
                            top: event.pageY
                        });
                    }
                });

                // when releasing the mouse check the drop position
                // if the item is dropped in the drop zone, send the drop message to the dropzone frame
                // if the item is dropped elsewhere, send the cancel message to the items frame
                $(document).mouseup(function (event) {

                    // get the contentWindow
                    var dropWin = dropFrame[0].contentWindow;
                    var dragWin = dragFrame[0].contentWindow;
                    if (dragItem) {
                        // drop position
                        var dropFrameOffset = dropFrame.offset();

                        // check to see if this is in the dropzone area
                        if (dropFrameOffset.top < event.clientY && dropFrameOffset.top + dropFrame.height() > event.clientY &&
                            dropFrameOffset.left < event.clientX && dropFrameOffset.left  + dropFrame.width() > event.clientX) {
                            // if so, send the drop message
                            dropWin.postMessage({
                                action: actions.drop,
                                item: {
                                    id: dragItemId,
                                    content: dragItemContent
                                }
                            }, '*');

                        } else {
                            // if it's not dropped in the dropzone, cancel it
                            dragWin.postMessage({
                                action: actions.cancel,
                                item: {
                                    id: dragItemId,
                                    content: dragItemContent
                                }
                            }, '*');
                        }

                        // reset parent frame item
                        dragItem.hide();
                        dragItem = null;
                    }
                });

            });
        };

        /**
         * Watch the dropzone frame
         */
        this.watchDrop = function() {

            $.each($(plugin.settings.dropFrameContent), function () {

                // when moving the cursor, send the move message to the parent frame
                $(document).mousemove(function (event) {
                    if (dragItemId) {
                        // send the move message
                        parent.postMessage({
                            action: actions.move,
                            frame: plugin.settings.dropZoneFrame,
                            position: {
                                left: event.pageX,
                                top: event.pageY
                            }
                        }, '*');
                    }
                });

                // when releasing the mouse
                $(document).mouseup(function () {
                    if (dragItemId) {
                        // send the final message to the parent frame
                        parent.postMessage({
                            action: actions.stop,
                            frame: plugin.settings.dragItemsFrame,
                            item: {
                                id: dragItemId
                            }
                        }, '*');
                        dragItemId = null;
                    }
                });
            });
        };

        // event listener for the drag frame
        this.dragEventHandler = function (message) {
            // read the action value
            var action = message.data.action;

            if (action == actions.stop) {
                // if the action received is stop, then remove the item and reset flags

                // remove the item once it was dropped
                //$("#" + message.data.itemId).remove();

                // reset flags
                dragStarted = false;
                dragElement = null;
            } else if (action == actions.cancel) {
                // if there is a cancel action just reset the flags
                dragStarted = false;
                dragElement = null;
            }
        };

        // event listener for the dropzone frame
        this.dropEventHandler = function (message) {
            // read the action value
            var action = message.data.action;

            if (action == actions.drop) {
                // get item data
                itemId = message.data.item.id;
                itemContent = this.minifyHtml(message.data.item.content);

                // make the POST request with content
                $.ajax({
                    type: "POST",
                    url: "post.html",
                    data: {
                        // minify content
                        id: itemId,
                        content: itemContent
                    },
                    success: function(data, textStatus, xhr) {
                        // log the response code
                        alert(xhr.status + "\n---------\n" + itemContent);
                    }
                });

                // send the dropped message
                parent.postMessage({
                    action: actions.stop,
                    frame: plugin.settings.dragItemsFrame,
                    item: {
                        id: dragItemId
                    }
                }, '*');

                // reset the item
                dragItemId = null;
            } else if (action == actions.start) {
                // set items values
                dragItemId = message.data.item.id;
                dragItemContent = message.data.item.content;
            } else if (action == actions.cancel) {
                // reset item values
                dragItemId = null;
                dragItemContent = null;
            }
        };

        // event listener for the parent frame
        this.parentEventHandler = function (message) {

            // get the frames
            var dragFrame = $(plugin.settings.dragItemsFrame);
            var dropFrame = $(plugin.settings.dropZoneFrame);

            // read the action value
            var action = message.data.action;

            if (action == actions.start) {
                // if we get the start action
                // set the parent frame item details and position
                dragItem = $(plugin.settings.parentDragItem);
                dragItem.html(message.data.item.content);
                dragItem.offset({
                    top: message.data.position.top,
                    left: message.data.position.left
                });
                // show the element after the position is set
                dragItem.show();

                // set the current dragged element
                dragItemId = message.data.item.id;
                dragItemContent = message.data.item.content;

                // forward message to the dropzone frame
                dropFrame[0].contentWindow.postMessage(message.data, '*');
            } else if (dragItem && action == actions.move) {

                // if moving, read the item offset
                var offsetTop = message.data.position.top;
                var offsetLeft = message.data.position.left;

                // calculate the item position based on the frames offset
                if (message.data.frame == plugin.settings.dropZoneFrame) {
                    var dropFrameOffset = dropFrame.offset();
                    offsetTop = offsetTop + dropFrameOffset.top;
                    offsetLeft = offsetLeft + dropFrameOffset.left;
                } else if (message.data.frame == plugin.settings.dragItemsFrame) {
                    var dragFrameOffset = dragFrame.offset();
                    offsetTop = offsetTop + dragFrameOffset.top;
                    offsetLeft = offsetLeft + dragFrameOffset.left;
                }

                // set the item position
                dragItem.offset({
                    top: offsetTop,
                    left: offsetLeft
                });
            } else if (dragItem && action == actions.cancel) {
                // send the cancel message
                dropFrame[0].contentWindow.postMessage({
                    action: actions.cancel,
                    item: {
                        id: dragItemId
                    }
                }, '*');

                // reset item
                dragItem.hide();
                dragItem = null;
            } else if (action == actions.stop) {
                // send the dropped message to the items frame
                dragFrame[0].contentWindow.postMessage({
                    action: actions.stop,
                    item: {
                        id: dragItemId
                    }
                }, '*');
            }
        };

        // simple method to remove spaces from an input
        this.minifyHtml = function (input) {
            // remove spaces
            var str = input.replace(/>\s+/g,'>').replace(/\s+</g,'<');

            return str;
        };

        // initialize the Dropper
        this.init();

    };

    $.fn.Dropper = function(options) {
        return this.each(function() {
            if (undefined === $(this).data('Dropper')) {
                var plugin = new $.Dropper(this, options);
                $(this).data('Dropper', plugin);
            }
        });
    };

})(jQuery);


// instantiate Dropper
$('body').Dropper();
