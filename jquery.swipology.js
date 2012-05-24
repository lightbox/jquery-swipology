/*
Copyright (c) 2012

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

$.browser.android = navigator.userAgent.match(/Android/i)  && !navigator.userAgent.match(/CrMo/) ? true : null;
$.browser.touch = !!('ontouchstart' in window);

$.fn.swipology = (function() {
    var fitfillsize, swcanvases = [], ws = [$(window).width(), $(window).height()];
    fitfillsize = function (boundsize, photosize, mode) {
        //boundsize = [w,h], photosize = [w,h]
        //returns sizes that fit a photosize photo to a boundsize box. if either is 0, we treat them as inifinity
        //mode = fit/contain or fill/cover
        boundsize[0] = parseInt(boundsize[0], 10);
        boundsize[1] = parseInt(boundsize[1], 10);
        photosize[0] = parseInt(photosize[0], 10);
        photosize[1] = parseInt(photosize[1], 10);
        if (!boundsize[0]) { boundsize[0] = Infinity; }
        if (!boundsize[1]) { boundsize[1] = Infinity; }
        if (boundsize[0] / boundsize[1] < photosize[0] / photosize[1] === (mode === 'fit' || mode === 'contain')) {
            return ([Math.floor(boundsize[0]), Math.floor(photosize[1] * boundsize[0] / photosize[0])]);
        } else {
            return ([Math.floor(photosize[0] * boundsize[1] / photosize[1]), Math.floor(boundsize[1])]);
        }
    };
    $(document).keydown(function(e) {
        var i;
        if (e.target && e.target.tagName == 'TEXTAREA' || e.target.tagName == 'INPUT') {
            return true;
        }
        if(e.keyCode == 37 || e.keyCode == 39) {
            //we first figure out if there's a swipology on the screen
            for(i = 0; i < swcanvases.length ; i+= 1) {
                //we animate the canvas that's in the viewport. take the midpoint of the canvas and a midpoint of the viewport and if they're close enough, we animate!
                if(Math.abs(($(window).scrollTop() * 2 + $(window).height()) / 2 - (swcanvases[i].offset().top * 2 + swcanvases[i].height()) / 2) < $(window).height() / 2) {
                    swcanvases[i].trigger(e.keyCode == 37 ? 'next_photo' : 'previous_photo');
                    break;
                }

            }
        }
    });
    
    $(window).on('resize', function() {
        var newws = [$(window).width(), $(window).height()];
        //android fires resize when you come back from title bar mode as well (the height changes). We want to ignore that.
        if(ws[0] !== newws[0]) {
            ws = newws;
            for(var i = swcanvases.length - 1; i >= 0; i -= 1) {
                $(swcanvases[i]).trigger('reload');
            }
        }
    });

    return function () {
        if($(this).length > 1) {
            $(this).each(function() {
                $(this).swipology();
            });
            return;
        }
        var swipics = [], swcanvas = $(this), swcontent, swdots, swfirst, sizes = {}, touchpool = {}, state = {}, direction, scrolltolerance = 30, swipetolerance = 75;
        //[TODO
        state.painted = false;
        state.offset = 0;
        state.cursor = 0;
        //TODO]
        if(swcanvas.find('.swipology_content').length) {return;}
        swcanvas.children().each(function() {
            var swipic = {}, swipico = $(this);
            if(swipico.is('a')) {
                swipic.url = swipico.attr('href');
                swipic.img_src = swipico.find('img').attr('src');
                swipic.alt = swipico.find('img').attr('alt');
            } else {
                swipic.img_src = swipico.attr('src');
                swipic.alt = swipico.attr('alt');
            }
            swipics.push(swipic);
        });
        
        swfirst = $('<img>');
        swfirst.attr('src',swipics[0].img_src);
        swfirst.on('load', function() {
            sizes.width = swcanvas.width();
            sizes.referencesize = fitfillsize([Math.min(this.width, sizes.width), Math.min(this.height, $(window).height())], [this.width, this.height],'fit');
            swcanvas.trigger('paint');
        });
        swcanvases.push(swcanvas);
        swcanvas.html(
            '<div class="swipology_dots">' + ($.map(swipics, function(val,i) { return '<a href="" '+(i == 0 ? 'class="swipology_active"' : '')+'><span></span></a>'; })).join('') + '</div>' + 
            (
                $.browser.touch ? '' : 
                ('<a href="" class="swipology_arrow swipology_arrow_left"></a>' + 
                '<a href="" class="swipology_arrow swipology_arrow_right"></a>')
            ) + 
            '<div class="swipology_content"></div>'
        );
        swcontent = swcanvas.find('.swipology_content');
        swdots = swcanvas.find('.swipology_dots');
        if(!$.browser.touch) {
            swdots.on('click','a', function(e) {
                e.preventDefault();
                swcanvas.trigger('jump_photo',swdots.find('a').index($(this)))
            });
            swcanvas.on('click', '.swipology_arrow', function(e) {
                e.preventDefault();
                $(this).trigger($(e.target).hasClass('swipology_arrow_left') ? 'next_photo' : 'previous_photo');
            });
        }
        swcanvas.on('reload', function(e,data) {
            swfirst.trigger('load');
        });
        swcanvas.on('movephoto', function(e, data) {
            var platform = '', style = {};
            if ($.browser.mozilla) {
                platform = '-moz';
            } else if ($.browser.webkit) {
                platform = '-webkit';
            } else if ($.browser.opera) {
                platform = '-o';
            }
            if (data['mode'] === 'rubber') {
                //this is rather lazy ass. Instead of bumping the actual content, we just bump the canvas. this will cause scrollbaring problems.
                if (platform == '') {
                    swcanvas.animate({
                        'left': data['amount'] + 'px'
                    }, data['speed'] * 1000, function() {
                        $(this).animate({
                            'left': 0
                        }, data['speed'] * 1000);
                    });
                } else {
                    style[platform + '-transition-duration'] = data['speed'] + 's';
                    style['left'] = data['amount'] + 'px';
                    swcanvas.css(style);
                    setTimeout(function() {
                        style['left'] = 0;
                        swcanvas.css(style);
                    }, data['speed'] * 1000)
                }
                return;
            }
            
            if (platform == '') {
                //no css transitions ie ie
                swcontent.animate({
                    'margin-left': (data['amount'] - state['offset']) + 'px'
                }, data['speed'] * 1000);
                return;
            }
            style[platform + '-transition-duration'] = data['speed'] + 's';
            //TODO feature-test rather than browser-check
            if ($.browser.webkit) {
                style[platform + '-transform'] = 'translate3d(' + (data['amount'] - state['offset']) + 'px,0,0)';
            } else {
                style[platform + '-transform'] = 'translate(' + (data['amount'] - state['offset']) + 'px,0)';
            }
            swcontent.css(style);
        });
        
        
        swcanvas.on('next_photo previous_photo same_photo jump_photo', function(e, data) {
            //TODO implement jump_photo
            var direction, newpage;
            if(e.type === 'jump_photo') {
                state.cursor = data;
            } else {
                direction = e.type === 'previous_photo' ? 1 : -1;
                if (e.type === 'same_photo' || state.cursor + direction < 0 || state.cursor + direction >= swipics.length) {
                    if ($.browser.touch) {
                        swcanvas.trigger('movephoto', {
                            'speed': .2,
                            'amount': -state.cursor * sizes.width
                        });
                    } else {
                        swcanvas.trigger('movephoto', {
                            'speed': .1,
                            'mode': 'rubber',
                            'amount': -direction * 10
                        })
                    }
                    return;
                }
                state.cursor += direction;
            }
            swdots.find('a:eq('+state.cursor+')').addClass('swipology_active').siblings('a').removeClass('swipology_active');
            swcanvas.trigger('movephoto', {
                'speed': .3,
                'amount': -state.cursor * sizes.width
            });
        });


        swcanvas.on('touchstart touchmove touchend touchcancel touchcomplete', function(e) {
            var touch;
            touch = e.originalEvent ? (e.originalEvent.touches[0] || e.originalEvent.changedTouches[0]) : null;
            if (state['touch'] == 'touchmove' && e.type == 'touchstart') {
                touchpool = {};
            }
            state.tocuh = e.type;
            switch (e.type) {
                case 'touchmove':
                    touchpool['current'] = (touch.pageX - touchpool['start']['x']) / sizes.width * 100;
                    if (!touchpool['scrolling'] && !touchpool['swiping']) {
                        touchpool['dx'] = touch.pageX - touchpool['start']['x'];
                        touchpool['dy'] = touch.pageY - touchpool['start']['y']
                        touchpool['distance'] = Math.sqrt(Math.pow(touchpool['dx'], 2) + Math.pow(touchpool['dy'], 2));
            
                        //we figure out the direction of the swipe
                        touchpool['phi'] = touchpool['distance'] == 0 ? 0 : Math.acos(Math.abs(touch.pageX - touchpool['start']['x']) / touchpool['distance']) / Math.PI * 180;
                        if (touchpool['dx'] < 0 && touchpool['dy'] < 0) {
                            touchpool['phi'] = 180 - touchpool['phi'];
                        } else if (touchpool['dx'] < 0 && touchpool['dy'] > 0) {
                            touchpool['phi'] += 180;
                        } else if (touchpool['dx'] > 0 && touchpool['dy'] > 0) {
                            touchpool['phi'] = 360 - touchpool['phi'];
                        }
                        //now we have number!
                        if (touchpool['distance'] > 10 && (Math.abs(touchpool['phi'] - 90) < scrolltolerance || Math.abs(touchpool['phi'] - 270) < scrolltolerance)) {
                            touchpool['generaldir'] = 'scroll';
                        } else if (touchpool['distance'] > 10 && (touchpool['phi'] < swipetolerance || touchpool['phi'] > 360 - swipetolerance || Math.abs(180 - touchpool['phi']) < swipetolerance)) {
                            touchpool['generaldir'] = 'swipe';
                        } else {
                            touchpool['generaldir'] = '';
                        }
                    }
                    if (touchpool['scrolling'] || (!touchpool['swiping'] && touchpool['generaldir'] == 'scroll')) {
                        touchpool['scrolling'] = true;
                        touchpool['swiping'] = false;
                        touchpool['current'] = 0;
                        swcanvas.trigger('movephoto', {
                            'speed': 0,
                            'amount': (-state.cursor * sizes.width)
                        });
                        return;
                    }
                    if (touchpool['swiping'] || touchpool['generaldir'] == 'swipe') {
                        touchpool['swiping'] = true;
                        swcanvas.trigger('movephoto', {
                            'speed': 0,
                            'amount': (-state.cursor * sizes.width + touch.pageX - touchpool.start.x)
                        });
                    }
                    if (touchpool['current'] != 0) {
                        e.preventDefault();
                    }
                    break;
            case 'touchcomplete':
                touchpool = {};
                break;
            case 'touchstart':
                if (!touchpool['touching']) {
                    touchpool['timestart'] = new Date();
                    touchpool['touching'] = true;
                    touchpool['start'] = {
                        x: touch.pageX,
                        y: touch.pageY,
                        scrollTop: $(window).scrollTop()
                    };
                    touchpool['current'] = 0;
                }
                break;
            default:
                //touchhend, touchcancel
                if (touchpool['swiping']) {
                    touchpool['finishing'] = true;
                    direction = Math.max(-1, Math.min(1, Math.round(touchpool['current'] / 25))); //the lower the number at the end, the higher the sensibilty
                    if (direction == -1) {
                        swcanvas.trigger('previous_photo');
                    } else if (direction == 1) {
                        swcanvas.trigger('next_photo');
                    } else {
                        swcanvas.trigger('same_photo');
                    }
                    setTimeout(function() {
                        swcanvas.trigger('touchcomplete');
                    }, 300)
                } else {
                    if ($.browser.android) {
                        //proper inertia scroll comes here for android:
                        if (touchpool['lastd'] && touchpool['prevscroll'] + touchpool['lastd'] > 1) {
                            $('body').animate({
                                'scrollTop': touchpool['prevscroll'] + touchpool['lastd']
                            }, 300);
                        }
                    }
                    swcanvas.trigger('touchcomplete');
                }
                break;
            }
        });
        swcanvas.on('paint', function() {
            var contentstyle = {};
            canvaswidth = swcanvas.width();
            
            //who supports background size? 
            if(state.painted) {
                contentstyle.opacity = 0;
            }
            contentstyle.width = (swipics.length * 200 + 300) + '%';

            swcontent.css(contentstyle);
            swcontent.html(($.map(swipics, function(val) {return '<div style="width:'+canvaswidth+'px; height: ' + (sizes.referencesize ? sizes.referencesize[1] : 0) + 'px; background: url(' + val.img_src+ ') no-repeat center center; background-size: contain;"><img src="'+val.img_src+'" /></div>'})).join(''));
            swcanvas.trigger('movephoto', {
                'speed': 0,
                'amount': -state.cursor * sizes.width
            });
            if(state.painted) {
                swcontent.animate({'opacity': 1}, 300);
            }
            state.painted = true;

        });        
    };
}());
