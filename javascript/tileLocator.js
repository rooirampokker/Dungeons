//list all the tiles and allow user to find appropriate tile based on keyword search
var imagePath = "tiles\\";
tileSource = ["bottom,start",
			 "bottom,empty",
			 "bottom,hall",
			 "bottom,room1",
			 "bottom,altar",
			 "bottom,room",
			 "left,room",
			 "left,altar",
			 "left,hall",
			 "left,coffins",
			 "left,deadend1",			 
			 "left,room1",					 
			 "right,altar",
			 "top,altar",
			 "top,deadend1",
			 "top,room",
			 "top,hall",	 
			 "bottom,right,top,left,crossroad",
			 "bottom,right,top,left,crossroad1",
			 "bottom,right,top,left,crossroad2",
			 "bottom,right,top,left,crossroad3",
			 "bottom,right,top,left,crossroad5",
			 "bottom,right,top,left,crossroad6",
			 "bottom,right,top,left,statue,crossroad",
			 "bottom,right,top,left,crooked,crossroad2",
			 "bottom,right,top,left,deadend,crossroad",
			 "bottom,right,top,left,maze,crossroad",
			 "bottom,right,top,left,stair,crossroad",
			 "bottom,right,top,left,deadend",
			 "bottom,right,top,left,stairs",
			 "bottom,right,top,left,crooked,crossroad3",
			 "bottom,right,top,left,crooked,crossroad4",
			 "bottom,right,top,left,crooked,crossroad5",
			 "bottom,right,top,left,crooked,crossroad6",
			 "bottom,right,top,passage",
			 "bottom,right,top,fire",
			 "bottom,top,left,fire",
			 "bottom,right,top,lava",
			 "bottom,top,left,room",
			 "bottom,top,left,lava",
			 "bottom,top,left,passage",
			 "bottom,top,left,passage1",
			 "bottom,top,trap1",
			 "bottom,top,trap2",
			 "bottom,top,items",
			 "bottom,top,pool",			 
			 "bottom,top,pit",
			 "bottom,top,pit1",
			 "bottom,top,pit2",	
			 "bottom,top,pit3",
			 "bottom,top,tropies",
			 "bottom,top,empty",
			 "bottom,top,crooked,passage3",
			 "bottom,top,passage1",
			 "bottom,top,passage2",
			 "bottom,top,passage4",
			 "bottom,top,passage",
			 "bottom,right,crooked,passage1",
			 "bottom,right,statue",
			 "bottom,right,pool",
			 
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
			 "right,left,crooked,passage3",
			 "bottom,right,left,fire",
			 "bottom,right,left,lava",
			 "bottom,right,left,stairs",
			 "bottom,right,passage",
			 "bottom,right,passage1",
			 "bottom,right,passage3",
			 "bottom,right,passage4",
			 "bottom,right,ornate",
	
			 "bottom,left,passage",
			 "bottom,left,statue",
			 "bottom,left,ornate",
			 "bottom,left,pool",
			 "bottom,left,stairs",
			 "bottom,left,stairs1",
			 "bottom,left,tower,stairs",
			 "right,top,left,passage",
			 "right,top,left,fire",
			 "right,top,left,lava",
			 "bottom,left,passage5",
			 "right,top,left,crooked,stairs",
			 "right,top,passage",	
			 "right,top,passage4",
			 "right,top,statue", 
			 "right,left,trap2",
			 "right,left,trap3",
			 "right,left,pool",
			 "right,left,pit",
			 "right,left,pit1",
			 "right,left,pit2",
			 "right,left,items",
			 "right,left,passage1",
			 "right,left,passage",
			 "right,left,passage2",
			 "right,left,passage3",
			 "right,left,passage4",
			 "right,left,trophies",
			 "right,top,ornate",
			 "right,room",
			 "right,coffins",
			 "top,left,passage",
			 "top,left,ornate",
			 "top,left,stairs",
			 "top,left,tower,stairs",
			 "top,left,statue",
			 "top,right,crooked,stairs",
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