/*
*
*
*/
window.buildBigRoom = function(tilePref, tileHistory, row, col) {
	if (row > 0) {
		finalResult = getNextBigroomTile(tileHistory, totCols);
		if (!finalResult) {

			return tilePref;
		}
		//IF WE DON'T HAVE A BIGROOM YET...?
		if (finalResult[0] === "south,east,corner,bigroom,") {
			//ARE CONDITIONS CONDUCIVE FOR A BIG ROOM?
			//does the tile diagonally above/right (up, plus 1 onwards) end with a downward exit to accept the entrance to the bigchamber (should be incoming following round)
			//the tile after this (up, plus 2 onwards) may not end in a downward exit, due the closing corner with no connecting 'up'
			//the tile directly above must end with a downward exit either, for similar reasons as above
			//ensure that we always start at least 3 tiles away from the east edge
			//ensure that we always start at least 3 tiles away from the west edge
			if (tileHistory[(tileHistory.length - totCols)]["south"] &&
				!tileHistory[(tileHistory.length - totCols) + 1]["south"] &&
				!tileHistory[(tileHistory.length - totCols) - 1]["south"] &&
				col < totCols - 3 &&
				col > 3 &&
				row < totRows - 3 &&
				tilePref.exclude.includes("west") &&
				$("#bigRoomFlag").val() == "false") {
				//WE DON'T HAVE A BIGROOM YET AND CONDITIONS ARE CONDUCIVE - ROLL THE DICE...
				if (Math.random() > 0.1) {
					console.log('------------------->start bigroom at row: ' + row + ', col: ' + col + "<----------------------");
					tilePref.include = finalResult[0].split(",");
					//remove the 'bigroom' exclusion...
					tilePref.exclude.splice(tilePref.exclude.indexOf("bigroom"), 1);
					$("#bigRoomFlag").val(true);
				} else {
					//CONDITIONS MAY BE CONDUCIVE FOR A BIGROOM, BUT CHANCE DECIDED AGAINST IT
				}

			}
			//WE SPOTTED A BIGROOM - LETS BUILD IT
		} else {
			tilePref.include = finalResult[0].split(",");
			tilePref.exclude = [];
		}
	}

	return tilePref;
}
/*
*
*
*
*/
window.getNextBigroomTile = function(tileHistory, totCols) {
if ((tileHistory[tileHistory.length-3] !== undefined &&
	tileHistory[tileHistory.length-3]["others"].indexOf("bigroom") > -1) ||
	(tileHistory[(tileHistory.length-((totCols*3)+3))] != undefined &&
	tileHistory[(tileHistory.length-((totCols*3)+3))]["others"].indexOf("bigroom") > -1)) {
		return false;
}
	//first check if previous tile is already a bigroom tile....
	if (tileHistory[tileHistory.length-1]["others"].indexOf("bigroom") > -1) {
	//previous tile was a bigroom - what about the one before that
		if (tileHistory[tileHistory.length-2]["others"].indexOf("bigroom") > -1) {
		//previous 2 rows were already bigrooms - this means that we're in the last column of a bigroom and the current tile could be a corner ("south,east,corner,bigroom" or "north,east,corner,bigroom") or a east-entrance ("east,entrance,bigroom")
			includeCol = ["south,west,corner,bigroom,",
						  "north,west,corner,bigroom,",
						  "east,entrance,bigroom,"];
		} else {
		//previous tile was a bigroom, but not the one before that - this means that we're in the middle-column of a bigroom and the current tile could be an entrance ("north,entrance,bigroom" or "botttom,entrance,bigroom") or center-piece ("center,bigroom")
			includeCol = ["north,entrance,bigroom,",
						  "center,bigroom,",
						  "south,entrance,bigroom,"];
		}
	//no earlier bigroom tiles in this row...should we start a new bigroom?
	} else {
		includeCol = ["south,east,corner,bigroom,",
					  "west,entrance,bigroom,",
					  "east,north,corner,bigroom,"]
	}
	//check vertically - cols
	//is the tile directly above a bigroom?
	if (tileHistory[(tileHistory.length-totCols)-1]["others"].indexOf("bigroom") > -1) {
		//tile directly above us is a bigroom - what about the tile above that...?
		if (tileHistory[(tileHistory.length-((totCols*2)+2))]["others"].indexOf("bigroom") > -1) {
			//the 2 tiles above are already bigrooms, so we're on the south row
			includeRow = ["east,north,corner,bigroom,",
						  "north,west,corner,bigroom,",
						  "south,entrance,bigroom,"];
		} else {
			includeRow = ["west,entrance,bigroom,",
						  "east,entrance,bigroom,",
						  "center,bigroom,"];
		}
	} else { //tile above is not bigroom either
		includeRow = ["south,east,corner,bigroom,",
					  "south,west,corner,bigroom,",
					  "north,entrance,bigroom,"]
	}
	finalResult = _.intersection(includeRow, includeCol);

//are we at the last tile of this room - can we unset our "room in progress" flag?
	if (finalResult[0].includes("north,west,corner")) {
		$("#bigRoomFlag").val(false);
	//ok fine, room is still being built - check the west walls so we can connect corridors and close off if there are nothing incomming
	} else if (finalResult[0].includes("west,entrance,") || finalResult[0].includes("east,north,")) {
		if (!tileHistory[(tileHistory.length-1)]["east"]) {
			finalResult[0] += "deadend,";
		} else {
			finalResult[0] += "open,";
		}
	}

	return finalResult;
}
