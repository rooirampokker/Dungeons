function activateMove(charID, currentLocation) {
  $(charID).attr("tabindex",-1).focus();
  x = 2;
  y = 4;
  //finds the hero position in the dungeon
  globalPosition = $(charID).prev().attr("id").split("_")
  globalY = globalPosition[1]
  globalX = globalPosition[2]
  moveCharacter(charID)
}

function moveCharacter(charID) {
  var locked = false;
  $(charID).on('keydown', function(event) {
      var legalMoves = getCurrentLocation(charID)
      if (locked) {
        return false;
      }
      locked = true;
      switch(event.which) {
          case 37:
            if (legalMoves.indexOf("west") > -1) {
              $('#hero').stop().animate({
                  left: '-=23.5'
              }); //left/west arrow key
              x--;
            }
            event.preventDefault();
            break;
          case 38:
            if (legalMoves.indexOf("north") > -1) {
              $('#hero').stop().animate({
                          top: '-=23.5'
              }); //up/north arrow key
              y--;
            }
            event.preventDefault();
            break;
          case 39:
            if (legalMoves.indexOf("east") > -1) {
              $('#hero').stop().animate({
                  left: '+=23.5'
              }); //right/east arrow key
              x++;
            }
            event.preventDefault();
            break;
          case 40:
            if (legalMoves.indexOf("south") > -1) {
              $('#hero').stop().animate({
                  top: '+=23.5'
              }); //bottom/south arrow key
              y++;
            }
            event.preventDefault();
            break;
      }
      setTimeout(function(){locked = false;},350);
  });
}

function getCurrentLocation(charID) {
  var currentLocation = $(charID).prev();
  var tile_x = x;
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
  var youAreHere = $(dungeonGrid).find('img#coord_'+globalY+'_'+globalX)[0]
  var tileAttr = $(youAreHere).attr('class').split(' ')
  var tileName = tileAttr[0]
   if (tileAttr.length > 2) {
     var inverted = tileAttr[1]
   }
   if (inverted == 'flip-hor') {
    var tile_x = 5-x;
    var tileMap = tileSource[tileName].map[y+','+tile_x].split(',')
    $.each(tileMap, function(key, value) {
      if (value == 'east') { tileMap[key] = 'west';}
      if (value == 'west') { tileMap[key] = 'east';}
    })
    tileMap = tileMap.join()
   } else tileMap = tileSource[tileName].map[y+','+x]
  //console.log(tileMap)
  return tileMap
}
