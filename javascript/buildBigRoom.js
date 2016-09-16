/*
*
*
*/
function buildBigRoom (tileHistory, tilePref, row, col,startBigroom = false) {
	finalResult = getNextBigroomTile(tileHistory, totCols);
	if (finalResult === false) {
		console.log("bigroom finished at row: "+row+" col: "+col);
		return tilePref;
	}
	//IF WE DON'T HAVE A BIGROOM YET...?
	if (finalResult[0] === "bottom,right,corner,bigroom,") {
		//ARE CONDITIONS CONDUCIVE FOR A BIG ROOM? 
			//does the tile perpendicularly above (up, plus 1 onwards) end with a downward exit to accept the entrance to the bigchamber (should be incoming following round) 
			//the tile after this (up, plus 2 onwards) may not end in a downward exit, due the closing corner with no connecting 'up'
			//the tile directly above must end with a downward exit either, for similar reasons as above
			//ensure that we always start at least 3 tiles away from the right edge
			//ensure that we always start at least 3 tiles away from the left edge
		if (tileHistory[(tileHistory.length-totCols)].indexOf("bottom") > -1 &&
		    tileHistory[(tileHistory.length-totCols)+1].indexOf("bottom") === -1 && 
		    tileHistory[(tileHistory.length-totCols)-1].indexOf("bottom") === -1 &&
		    col < totCols-3 && 
		    col > 3 &&
		    row	< totRows-3 &&
		    tilePref.exclude.includes("left") &&
		    sessionStorage.getItem("bigRoomInProgress") == 0) {
	    //WE DON'T HAVE A BIGROOM YET AND CONDITIONS ARE CONDUCIVE - ROLL THE DICE...
			if (Math.random() > 0.4) {
				console.log('------------------->start bigroom at row: '+row+', col: '+col+"<----------------------");
				tilePref.include = finalResult[0];
				tilePref.exclude = tilePref.exclude.replace("bigroom", "");
				sessionStorage.setItem("bigRoomInProgress",1);
			} else {
			//CONDITIONS MAY BE CONDUCIVE FOR A BIGROOM, BUT CHANCE DECIDED AGAINST IT
			}

	    }
	//WE SPOTTED A BIGROOM - LETS BUILD IT
	} else {
		tilePref.include = finalResult[0];
		tilePref.exclude = ",";
	}
	//console.log(" row: "+row+" col: "+col+" Result: "+finalResult);
	return tilePref;		
}
/*
*
*
*
*/
function getNextBigroomTile(tileHistory, totCols) {
if ((tileHistory[tileHistory.length-3] != undefined && 
	tileHistory[tileHistory.length-3].indexOf("bigroom") > -1) ||
	(tileHistory[(tileHistory.length-((totCols*3)+3))] != undefined &&
	tileHistory[(tileHistory.length-((totCols*3)+3))].indexOf("bigroom") > -1)) {	
		return false;
} 	
	//first check if previous tile is already a bigroom tile....
	if (tileHistory[tileHistory.length-1].indexOf("bigroom") > -1) {
	//previous tile was a bigroom - what about the one before that
		if (tileHistory[tileHistory.length-2].indexOf("bigroom") > -1) {
		//previous 2 rows were already bigrooms - this means that we're in the last column of a bigroom and the current tile could be a corner ("bottom,right,corner,bigroom" or "top,right,corner,bigroom") or a right-entrance ("right,entrance,bigroom")
			includeCol = ["bottom,left,corner,bigroom,", 
						  "top,left,corner,bigroom,", 
						  "right,entrance,bigroom,"];
		} else {
		//previous tile was a bigroom, but not the one before that - this means that we're in the middle-column of a bigroom and the current tile could be an entrance ("top,entrance,bigroom" or "botttom,entrance,bigroom") or center-piece ("center,bigroom")
			includeCol = ["top,entrance,bigroom,", 						  
						  "center,bigroom,",
						  "bottom,entrance,bigroom,"];
		}
	//no earlier bigroom tiles in this row...should we start a new bigroom?
	} else {
		includeCol = ["bottom,right,corner,bigroom,", 
					  "left,entrance,bigroom,", 
					  "right,top,corner,bigroom,"]
	}
	//check vertically - cols
	//is the tile directly above a bigroom?
	if (tileHistory[(tileHistory.length-totCols)-1].indexOf("bigroom") > -1) {	
		//tile directly above us is a bigroom - what about the tile above that...?
		if (tileHistory[(tileHistory.length-((totCols*2)+2))].indexOf("bigroom") > -1) {	
			//the 2 tiles above are already bigrooms, so we're on the bottom row
			includeRow = ["right,top,corner,bigroom,", 
						  "top,left,corner,bigroom,", 
						  "bottom,entrance,bigroom,"];			
		} else {
			includeRow = ["left,entrance,bigroom,", 
						  "right,entrance,bigroom,", 
						  "center,bigroom,"];
		}
	} else { //tile above is not bigroom either
		includeRow = ["bottom,right,corner,bigroom,", 
					  "bottom,left,corner,bigroom,",
					  "top,entrance,bigroom,"]
	}
	finalResult = _.intersection(includeRow, includeCol);

//are we at the last tile of this room - can we unset our "room in progress" session?
	if (finalResult[0].includes("top,left,corner")) {
		sessionStorage.setItem("bigRoomInProgress", 0);
	//ok fine, room is still being built - check the left walls so we can connect corridors and close off if there are nothing incomming
	} else if (finalResult[0].includes("left,entrance,") || finalResult[0].includes("right,top,")) {
		if (!tileHistory[(tileHistory.length-1)].includes("right")) {
			finalResult[0] += "deadend,";
		} else {
			finalResult[0] += "open,";
		}
	}
	return finalResult;	
}