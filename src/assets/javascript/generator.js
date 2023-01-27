//get input parameters from user
$(function() {
/*
*
*
*/
    function generateDungeon() {
		console.clear();
		localStorage.removeItem('goldenThread');
		$("#dungeonGrid").html("");
		totRows = $("#dungeonHeight").val();
		totCols = $("#dungeonWidth").val();
		tileSize = $("#tileSize").val();
        debugGrid = $("#debugGrid:checked").val();

		var dungeonGrid = $("#dungeonGrid");
		var newDungeonCol = $("<span class='col'>");
		var newDungeonRow = $("<div class='row'>");

		$("#bigRoomFlag").val("false");
		var row = 0;
		var col = 0;
		var startFlag = true;
		var tileHistory = [];
		var tilePref = {include:"",
					    exclude:"",
						others:""};
		var image = "";
		var overlayImage = "";
	//generate dungeon layout
		while(row <= totRows) {
				var newRow = $(newDungeonRow).clone();
				while(col <= totCols) {
					var newCol = newDungeonCol.clone();
					tilePref.exclude = "filler,";
					tilePref.include = ",";
					tilePref = checkSurroundingTiles (tilePref, tileHistory, row, col);
					tilePref = buildBigRoom(tilePref, tileHistory, row, col);
					//DROP THE STARTER IN - ANYWHERE (JUST ONCE!) ON THE FIRST ROW, AFTER THE FIRST COL, AT THE FIRST SPOT WHERE THERE IS NO JOINING CORRIDOR COMING IN FROM THE WEST
					if (!(image['east']) && startFlag && (col > 0 && row == 0)) {
						tilePref.include += "start,";
						startFlag = false;
					} else {
						tilePref.exclude += "start,";
					}
					var tileOptions = getSelectedTiles(tilePref, row, col);
					image = shuffleTiles(tileOptions, row, col);
					flip = applyFlip(image, tilePref, row, col);
					tileHistory.push(image);
					if (tileSize == 2) {
						var tileHeight = "140px";
						var tileWidth = "140px";
						imagePath = "assets\\images\\140\\";
						overlayImage = applyOverlay(image, imagePath, row, col);
					} else {
						var tileHeight = "90px";
						var tileWidth = "90px";
						imagePath = "assets\\images\\";
          }
					var baseImage = $("<img />").attr({"src":imagePath+image.fileName+".png", "class":image.fileName+flip+" base ", "id":"coord_"+row+"_"+col});
          newCol.html(baseImage).append(overlayImage);
          showUnmappedTiles(newCol, baseImage, image, tileHeight, tileWidth);
					newRow.append(newCol);
					col++;
				}

				$(dungeonGrid).append(newRow);
				col = 0;
				row++;
		}
	$(dungeonGrid).append(newRow);
	}
 $("#submit").bind("click", function (){generateDungeon(); activateMove("#hero")});
});
