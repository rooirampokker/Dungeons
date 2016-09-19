/*
*
*
*/
function checkSurroundingTiles (tilePref, tileHistory, previousImage, row, col) {	
	//SPECIFIC ROW-LOCATION-BASED EXCLUSIONS
	if (row == 0) {
		tilePref.exclude = "north,filler,bigroom,deadend,";
		tilePref.include = ",";			
//EVERYTHING EXCEPT THE north ROW
	} else {
		//exclusion of bigroom may be overridden later in the buildBigRoom function
		tilePref.exclude = "start,bigroom,";
		tilePref.include = ",";
	//CHECK TILE ABOVE
		tileAbove = tileHistory[(tileHistory.length-totCols)-1];
		if (tileAbove["south"]) {
			tilePref.include += "north,";
		} else {
			tilePref.exclude += "north,";
		}
		tilePref.include += ",";
	}

	//CHECK AGAINST PREVIOUS TILE...
	if (tileHistory.length > 0 ) {
	//EXIT east -- CONNECT west
		if (tileHistory[tileHistory.length-1]['east']) {
			tilePref.include += "west,";
	//NO east, SO EXCLUDE west
		} else {
			tilePref.exclude += "west,";
		}
	}				
//SPECIFIC COLUMN-LOCATION-BASED EXCLUSIONS	
	if (col == 0) {
		tilePref.exclude += "west,";
	} else tilePref.include += ",";
	if (col == totCols) {
		tilePref.exclude += "east,";
	} 
	if (row == totRows) {
		tilePref.exclude += "south,";
	}
	if (row > 0) {
		tilePref = buildBigRoom (tileHistory, tilePref, row, col);	
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
	 $.each(tileList, function(key, tileAttr) {
	 	if ((tileAttr[searchItem] !== undefined && tileAttr[searchItem] === true) || tileAttr['others'].indexOf(searchItem) > -1) {
	 		 tempTileInclude.push(tileList[key]);
	 		} else {
	 		 tempTileExclude.push(tileList[key]);	 
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
	var tileList = tileSource;
	includeThis = cleanArray(tilePref.include.substring(0, tilePref.include.length-1).split(","));
	excludeThis = cleanArray(tilePref.exclude.substring(0, tilePref.exclude.length-1).split(","));	
	$(includeThis).each(function(searchIndex) {
		tileList = refineShortlist(tileList, includeThis[searchIndex], "include");	
	});	
	$(excludeThis).each(function(searchIndex) {
		tileList = refineShortlist(tileList, excludeThis[searchIndex], "exclude");	
	});
	return tileList;
}
/*
*	thank you interwebs for this shuffler :-D
*   Just takes an array as input parameter, shuffles it about and returns the new array
*/
function shuffleTiles(arr, row, col) {
  for(var j, x, i = arr.length; i; j = parseInt(Math.random() * i), x = arr[--i], arr[i] = arr[j], arr[j] = x);
  if (arr[0] === undefined) {
	 arr = ["filler"];

  }

  return arr[0];
}
/*
*
*/
function cleanArray(thisArray) {
	return $.grep(thisArray,function(n){ return n == " " || n })	
}
