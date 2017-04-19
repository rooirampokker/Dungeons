//get input parameters from user
$(function() {
/*
*
*
*/
    function generateDungeon() {
    console.clear();
		$("#dungeonGrid").html("");
		totRows = $("#dungeonHeight").val();
		totCols = $("#dungeonWidth").val();
		tileSize = $("#tileSize").val();

		var dungeonGrid = $("#dungeonGrid");
		var newDungeonCol = $("<span class='col'>");
		var newDungeonRow = $("<div class='row'>");

		$("#bigRoomFlag").val("false");
		var row = 0;
		var col = 0;
		var startFlag = true;
		var tileHistory = [];
		var tilePref = {include:"",
					    exclude:""};
		var image = "";
		var overlayImage = "";
	//generate dungeon layout
		while(row <= totRows) {
				var newRow = $(newDungeonRow).clone();
				while(col <= totCols) {
					var newCol = newDungeonCol.clone();
					tilePref.exclude = "filler,";
					tilePref.include = ",";
					tilePref = checkSurroundingTiles (tilePref, tileHistory, image, row, col);
					//DROP THE STARTER IN - ANYWHERE (JUST ONCE!) ON THE FIRST ROW, AFTER THE FIRST COL, AT THE FIRST SPOT WHERE THERE IS NO JOINING CORRIDOR COMING IN FROM THE WEST
					if (!(image['east']) && startFlag && (col > 0 && row == 0)) {
						tilePref.include += "start,";
						startFlag = false;
					} else {
						tilePref.exclude += "start,";
						tilePref.include += ",";
					}
					var tileOptions = getSelectedTiles(tilePref, row, col);
					image = shuffleTiles(tileOptions, row, col);
					flip = applyFlip(image, tilePref, row, col);
					tileHistory.push(image);
					if (tileSize == 2) {
						imagePath = "tiles\\140\\";
						overlayImage = applyOverlay(image, imagePath, row, col);
					} else imagePath = "tiles\\";
					var baseImage = $("<img />").attr({"src":imagePath+image.fileName+".png", "class":image.fileName+flip+" base", "id":"coord_"+row+"_"+col});
					newCol.html(baseImage).append(overlayImage);
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
