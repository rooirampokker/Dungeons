function activateMove(charID) {
  $(charID).attr("tabindex",-1).focus();
  x = 2;
  y = 4;
  //finds the hero position in the dungeon
  globalPosition = $(charID).prev().attr("id").split("_")
  globalY = globalPosition[1]
  globalX = globalPosition[2]
  moveCharacter(charID)
}
/*
*
*
*/
function moveCharacter(charID) {
  var locked = false;
  $(charID).on('keydown', function(event) {
    if (locked) {return false;}
      locked = true;
      var legalMoves = getCurrentLocation(charID)
      switch(event.which) {
          case 65:
          case 37:
            if (legalMoves.indexOf("west") > -1) {
              $('#hero').stop().animate({
                  left: '-=23.5'
              },150); //left/west arrow key
              x--;
            } else {
              bounce('west');
            }
            event.preventDefault();
            break;

          case 87:
          case 38:
            if (legalMoves.indexOf("north") > -1) {
              $('#hero').stop().animate({
                          top: '-=23.5'
              },150); //up/north arrow key
              y--;
            } else {
              bounce('north');
            }
            event.preventDefault();
            break;

          case 68:
          case 39:
            if (legalMoves.indexOf("east") > -1) {
              $('#hero').stop().animate({
                  left: '+=23.5'
              },150); //right/east arrow key
              x++;
            } else {
              bounce('east');
            }
            event.preventDefault();
            break;

          case 83:
          case 40:
            if (legalMoves.indexOf("south") > -1) {
              $('#hero').stop().animate({
                  top: '+=23.5'
              },150); //bottom/south arrow key
              y++;
            } else {
              bounce('south');
            }
            event.preventDefault();
            break;

            case 81: //diagonal left-up
            if (legalMoves.indexOf("nw") > -1) {
              $('#hero').stop().animate({
                  left: '-=23.5',
                  top: '-=23.5'
              },150); //bottom/south arrow key
              y--;
              x--;
            } else {
              bounce('nw');
            }
            event.preventDefault();
            break;
          case 69: //diagonal right-up
          if (legalMoves.indexOf("ne") > -1) {
            $('#hero').stop().animate({
                left: '+=23.5',
                top: '-=23.5'
            },150); //bottom/south arrow key
            y--;
            x++;
          } else {
            bounce('ne');
          }
          event.preventDefault();
          break;

          case 192: //diagonal left-down
          if (legalMoves.indexOf("sw") > -1) {
            $('#hero').stop().animate({
                left: '-=23.5',
                top: '+=23.5'
            },150); //bottom/south arrow key
            y++;
            x--;
          } else {
            bounce('sw');
          }
          event.preventDefault();
          break;

          case 67: //diagonal right-down
          if (legalMoves.indexOf("se") > -1) {
            $('#hero').stop().animate({
                left: '+=23.5',
                top: '+=23.5'
            },150); //bottom/south arrow key
            y++;
            x++;
          } else {
            bounce('se');
          }
          event.preventDefault();
          break;
      }
      setTimeout(function(){locked = false;},150);
  });
}
/*
*
*/
function bounce(direction) {
  if (direction == 'west') {
      $('#hero').animate({left: '-=6'},100)
                .animate({left: '+=6'},100);
  } else if (direction == 'east') {
    $('#hero').animate({left: '+=6'},100)
              .animate({left: '-=6'},100);
  } else if (direction == 'north') {
    $('#hero').animate({top: '-=6'},100)
              .animate({top: '+=6'},100);
  } else if (direction == 'south') {
    $('#hero').animate({top: '+=6'},100)
              .animate({top: '-=6'},100);
  } else if (direction == 'ne') {
    $('#hero').animate({top: '-=6', left: '+=6'},100)
              .animate({top: '+=6', left: '-=6'},100);
  } else if (direction == 'nw') {
    $('#hero').animate({top: '-=6', left: '-=6'},100)
              .animate({top: '+=6', left: '+=6'},100);
  } else if (direction == 'sw') {
    $('#hero').animate({top: '+=6', left: '-=6'},100)
              .animate({top: '-=6', left: '+=6'},100);
  } else if (direction == 'se') {
    $('#hero').animate({top: '+=6', left: '+=6'},100)
              .animate({top: '-=6', left: '-=6'},100);
  }
}
/*
*
*
*/
function getCurrentLocation(charID) {
  var currentLocation = $(charID).prev();
  var tile_x = x;
  var tileMap = []
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
    globalY++;
  //hero moved down into new tile
  } else if (y < 0) {
    y = 5
    globalY--;
  }
  var youAreHere = $(dungeonGrid).find('img#coord_'+globalY+'_'+globalX)[0]
  var tileAttr = $(youAreHere).attr('class').split(' ')
  var tileName = tileAttr[0]
  if (tileAttr.length > 2) {
   var inverted = tileAttr[1]
  }
  tileMap = flipTile(inverted, tileName);
  return tileMap
}
/*
*
*
*/
function flipTile(inverted, tileName) {
  if (inverted == 'flip-vert') {
    var tile_y = 5-y;
    tileMap = tileSource[tileName].map[tile_y+','+x].split(',')
    $.each(tileMap, function(key, value) {
      tileMap[key] = flipVert(value, tileMap[key]);
    })
    tileMap = tileMap.join()
  } else if (inverted == 'flip-hor') {
    var tile_x = 5-x;
    tileMap = tileSource[tileName].map[y+','+tile_x].split(',')
    $.each(tileMap, function(key, value) {
      tileMap[key] = flipHor(value, tileMap[key]);
    })
    tileMap = tileMap.join()
  } else if (inverted == 'flip-hor-vert') {
    var tile_x = 5-x;
    var tile_y = 5-y;
    tileMap = tileSource[tileName].map[tile_y+','+tile_x].split(',')
    $.each(tileMap, function(key, value) {
      tileMap[key] = flipHor(value, tileMap[key]);
      tileMap[key] = flipVert(value, tileMap[key]);
    })
    tileMap = tileMap.join()
  } else tileMap = tileSource[tileName].map[y+','+x]
  return tileMap
}

function flipHor(value, tile) {
  if (value == 'east') { tile = 'west'; }
  if (value == 'west') { tile = 'east'; }
   if (value == 'ne') { tile = 'nw'; }
   if (value == 'se') { tile = 'sw'; }
   if (value == 'sw') { tile = 'se'; }
   if (value == 'nw') { tile = 'ne'; }
  return tile;
}

function flipVert(value, tile) {
  if (value == 'north') { tile = 'south'; }
  if (value == 'south') { tile = 'north'; }
  if (value == 'ne') { tile = 'sw'; }
  if (value == 'se') { tile = 'nw'; }
  if (value == 'sw') { tile = 'ne'; }
  if (value == 'nw') { tile = 'se'; }
  return tile;
}
