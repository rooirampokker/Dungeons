function activateMove() {
  $("#hero").attr("tabindex",-1).focus();
  var locked = false;
  x = 2;
  y = 1;
  currentLocation = "bottom,start";
  //finds the hero position in the dungeon
  globalPosition = $("#hero").prev().attr("id").split("_")
  globalY = globalPosition[1]
  globalX = globalPosition[2]
  $("#hero").on('keydown', function(event) {
        if (locked) {
          return false;
        }
        locked = true;
        switch(event.which) {
            case 37:
                $('#hero').stop().animate({
                    left: '-=23.5'
                }); //left arrow key
                x--;
                event.preventDefault();
                break;
            case 38:
                $('#hero').stop().animate({
                            top: '-=23.5'
                }); //up arrow key
                y++;
                event.preventDefault();
                break;
            case 39:
                $('#hero').stop().animate({
                    left: '+=23.5'
                }); //right arrow key
                x++;
                event.preventDefault();
                break;
            case 40:
                $('#hero').stop().animate({
                    top: '+=23.5'
                }); //bottom arrow key
                y--;
                event.preventDefault();
                break;
        }
        getCurrentLocation()
        setTimeout(function(){locked = false;},400);
    });
  }

  function getCurrentLocation() {
    var currentLocation = $( "#hero" ).prev();
    //hero moved right into new tile
    if (x > 5) {
      x = 0
      globalX++;
    //hero moved left into new tile
    } else if (x < 0) {
      x = 5
      globalX--;
    }
    //hero moved up into new tile
    if (y > 5) {
      y = 0
      globalY--;
    //hero moved down into new tile
    } else if (y < 0) {
      y = 5
      globalY++;
    }
    //var dungeonGrid = $(dungeonGrid).html()
    var images = $(dungeonGrid).find('img#coord_'+globalY+'_'+globalX)
    console.log($(images)[0])
  }
