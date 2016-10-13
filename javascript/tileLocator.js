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
function refineShortlist(tileList, searchItem, returnType, row, col) {	
	 var tempTileExclude = [];
	 var tempTileInclude = [];
	 if (returnType == "include") {
	 	var tempTileArray = new Object();
	 } else {
	 	tempTileArray = $.extend(true, {}, tileList);
	 }
	 $.each(tileList, function(key, tileAttr) {
	 	if ((tileAttr[searchItem] !== undefined && tileAttr[searchItem] === true) || tileAttr['others'].indexOf(searchItem) > -1) {
	 		 if (returnType == "include") {	 		 	
	 		 	tempTileArray[key] = tileList[key];
	 		 } else {	 		
	 		 	delete tempTileArray[key];
	 		 }
	 	} else {
			if (searchItem === "west" &&
	 		 		!tileAttr[searchItem] && 
	 		 		tileAttr["east"] &&
	 		 		returnType == "include" &&
	 		 		tileAttr['others'].indexOf("bigroom") < 0) {
		 		 		tileList[key].west = true;
		 		 		tileList[key].east = false;
		 		 		tileList[key].flipHor = true;
		 		 		tempTileArray[key] = tileList[key];
	 		}
	 		if (searchItem === "north" &&
 				   !tileAttr[searchItem] && 
 		 		   tileAttr["south"] &&
 		 		   returnType == "include" &&
 		 		   tileAttr['others'].indexOf("bigroom") < 0) {
		 		 		tileList[key].north = true;
		 		 		tileList[key].south = false;
		 		 		tileList[key].flipVert = true;
		 		 		tempTileArray[key] = tileList[key];
	 	}	 		
	 	}
	 });
	return tempTileArray;
}
/*
*
*
*/	
function getSelectedTiles(tilePref, row, col) {
	var tileList = $.extend(true, {}, tileSource);
	includeThis = cleanArray(tilePref.include.substring(0, tilePref.include.length-1).split(","));
	excludeThis = cleanArray(tilePref.exclude.substring(0, tilePref.exclude.length-1).split(","));	

	$(includeThis).each(function(searchIndex) {
//exclude everything that IS NOT in this array
		tileList = refineShortlist(tileList, includeThis[searchIndex], "include", row, col);	
	});	
	
	$(excludeThis).each(function(searchIndex) {
//exclude everything that IS in this array		
		tileList = refineShortlist(tileList, excludeThis[searchIndex], "exclude", row, col);	
	});
	return tileList;
}
/*
*	
*   
*/
function shuffleTiles(arr, row, col) {
	var keys = Object.keys(arr);
  	if (keys.length === 0) {
  		console.log("ADD FILLER");
	 	arr = ["filler"];
  	} else {
  		arr = arr[keys[Math.floor(keys.length*Math.random())]];
  	}

  return arr;
}
/*
*
*/
function applyFlip(image, tilePref, row, col) {
//IF WE HAVE AN EXPLICIT INSTRUCTION TO FLIP THE TILE - THIS WILL BE USED LATER TO REDUCE THE ISSUE WHERE A SINGLE TILE IS COPIED MULTIPLE TIMES TO CHANGE EXIT DIRECTIONS			
 var style = "";
 if (image.flipHor) {
 		//console.log("FLIPPING HOR: "+row+","+col);
		style += " flip-hor";
	} 
	if (image.flipVert) {
		//console.log("FLIPPING VERT: "+row+","+col);	 		
		style += " flip-vert";
//IF WE HAVE PASSAGES WITH EITHER A NORTH/SOUTH OR EAST/WEST ENTRANCE			
	}
	if (((image.north == image.south) && 
		(image.east == image.west) && 
		Math.random() > 0.5) ||
		style == " flip-hor flip-vert") {
		style = " flip-hor-vert";
//IF WE HAVE PASSAGES WITH ETHER A SINGLE EAST OR WEST ENTRANCE			
	} else if (((image.east && 
					!image.north && 
					!image.south && 
					!image.west) || 
				(image.west && 
					!image.north && 
					!image.south && 
					!image.east)) &&
					!image.flipHor &&
				Math.random() > 0.5) {
		style +=  " flip-vert";
//IF WE HAVE PASSAGES WITH ETHER A SINGLE NORTH OR SOUTH ENTRANCE					
	} else if (((image.north && 
					!image.east && 
					!image.south && 
					!image.west) || 
				(image.south && 
					!image.north && 
					!image.west && 
					!image.east)) &&
				Math.random() > 0.5)  {
		style +=  " flip-hor";
	} 
	return style;
} 
/*
*
*/
function cleanArray(thisArray) {
	return $.grep(thisArray,function(n){ return n == " " || n })	
}
