//list all the tiles and allow user to find appropriate tile based on keyword search
var imagePath = "tiles\\";
tileSource = ["bottom,start",
			 "bottom,empty",
			 "bottom,room",
			 "bottom,room1",
			 "bottom,right,top,left,crossroad",
			 "bottom,right,top,left,crossroad1",
			 "bottom,right,top,left,crooked,crossroad2",
			 "bottom,right,top,left,crossroad3",
			 "bottom,right,top,left,stairs",
			 "bottom,right,top,left,crooked,crossroad5",
			 "bottom,right,top,passage",
			 "bottom,top,left,trap",
			 "bottom,top,left,passage",
			 "bottom,top,trap3",
			 "bottom,top,trap2",
			 "bottom,top,items",
			 "bottom,top,trap",			 
			 "bottom,top,empty",
			 "bottom,top,crooked,passage3",
			 "bottom,top,passage2",
			 "bottom,top,passage1",
			 "bottom,top,passage",
			 "bottom,right,crooked,passage1",
			 "bottom,right,empty",
			 
			 "bottom,right,bigroom",
			 "bottom,left,bigroom",
			 "top,left,bigroom",
			 "right,top,bigroom",
			 "top,entrance,bigroom",
			 "right,entrance,bigroom",
			 "bottom,entrance,bigroom",			 
			 "left,entrance,bigroom",			 
			 "bottom,right,top,left,stairs,bigroom",
			 "bottom,right,top,left,bigroom",
			 
			 "bottom,right,left,passage",
			 "bottom,right,left,passage1",
			 "bottom,right,left,stairs",
			 "bottom,right,passage3",
			 "bottom,right,ornate",
			 "bottom,right,passage",			 
			 "bottom,left,passage",
			 "bottom,left,empty",
			 "bottom,left,ornate",
			 "bottom,left,ornate1",
			 "bottom,left,crooked,stairs",
			 "right,top,left,passage",
			 "right,top,left,crooked,stairs",
			 "right,top,passage",			 
			 "right,left,trap2",
			 "right,left,trap1",
			 "right,left,trap",
			 "right,left,passage1",
			 "right,left,passage",
			 "right,top,passage1",
			 "right,room",
			 "top,left,passage",
			 "top,left,passage1",
			 "top,left,stairs",
			 "top,right,crooked,stairs",
			 "top,deadend1",
			 "top,room",
			 "left,deadend3",
			 "left,coffins",
			 "left,deadend1",			 
			 "left,deadend",
			 "left,deadend3",
			 "filler", 
			 "filler1"
			 ];
/*
*
*
*/
function checkSurroundingTiles (tilePref, tileHistory, previousImage, row, col) {	
	if (row == 0) {
		tilePref.exclude = "top,filler,bigroom,deadend,room,";
		tilePref.include = ",";			
//EVERYTHING EXCEPT THE TOP ROW
	} else {
		tilePref.exclude = "start,filler,bigroom,";
		tilePref.include = ",";
	//CHECK TILE ABOVE
		tileAbove = tileHistory[(tileHistory.length-totCols)-1];
		if (tileAbove.indexOf("bottom") > -1) {
			tilePref.include += "top,";
		} else {
			tilePref.exclude += "top,";
		}
		tilePref.include += ",";
	}
	//CHECK AGAINST PREVIOUS TILE...
	if (tileHistory.length > 0 ) {
	//EXIT RIGHT -- CONNECT LEFT
		if (tileHistory[tileHistory.length-1].indexOf("right") > -1) {
			tilePref.include += "left,";
	//NO RIGHT, SO EXCLUDE LEFT
		} else {
			tilePref.exclude += "left,";
		}
	}
	if (col == 0) {
		tilePref.exclude += "left,";
	} else tilePref.include += "";
	if (col == totCols) {
		tilePref.exclude += "right,";
	} 
	if (row == totRows) {
		tilePref.exclude += "bottom,";
	}
	
	return tilePref;

}			 
/*
*
*
*/			 
function refineShortlist(tileList, searchItem, returnType) {	
	 var tempTileExclude = [];
	 var tempTileInclude = [];
		$(tileList).each(function(tileIndex) {
			if ((tileList[tileIndex].indexOf(searchItem) == -1)) {
				 tempTileExclude.push(tileList[tileIndex]);	 
			} else {
				 tempTileInclude.push(tileList[tileIndex]);
			}
		});
	 if (returnType == "include") { 
		return tempTileInclude;
	 } else return tempTileExclude;
}
/*
*
*
*/	
function getSelectedTiles(tilePref) {
	var tileList = tileSource.slice(0);
	var tempTileSource = [];
	includeThis = tilePref.include.substring(0, tilePref.include.length-1).split(",");
	excludeThis = tilePref.exclude.substring(0, tilePref.exclude.length-1).split(",");	
	$(excludeThis).each(function(searchIndex) {
		tileList = refineShortlist(tileList, excludeThis[searchIndex], "exclude");	
	});
	$(includeThis).each(function(searchIndex) {
		tileList = refineShortlist(tileList, includeThis[searchIndex], "include");	
	});
	return tileList;
}
/*
*	thank you interwebs for this shuffler :-D
*   Just takes an array as input parameter, shuffles it about and returns the new array
*/
function shuffleTiles(arr) {
  for(var j, x, i = arr.length; i; j = parseInt(Math.random() * i), x = arr[--i], arr[i] = arr[j], arr[j] = x);
  if (arr[0] == undefined) {
	  arr = ["filler"];
  }
  return arr[0];
}